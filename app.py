import json
import os
from flask import Flask, request, jsonify, render_template, redirect, send_from_directory, Response
from datetime import datetime

# Cria o objeto principal do Flask
app = Flask(__name__, static_url_path='/static', static_folder='static')

# Configurações de pastas:
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
JSON_PATH = 'dados_desaparecidos.json'

# --- Configuração Inicial ---

# Cria a pasta de uploads se ela não existir
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    print(f"Pasta de uploads criada: {UPLOAD_FOLDER}")

# --- FUNÇÕES AUXILIARES DE DADOS ---

def carregar_dados():
    """Carrega o array de pessoas desaparecidas do arquivo JSON."""
    if not os.path.exists(JSON_PATH):
        return []
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        try:
            dados = json.load(f)
            return dados if isinstance(dados, list) else []
        except json.JSONDecodeError:
            # Retorna lista vazia se o JSON estiver mal formado ou vazio
            return []

def salvar_dados(dados):
    """Salva o array de pessoas desaparecidas no arquivo JSON."""
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)

# --- ROTAS DO SERVIDOR ---

# Rota para servir a pasta 'uploads' (necessário para que as fotos apareçam)
@app.route(f'/{UPLOAD_FOLDER}/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Rota PRINCIPAL (Menu Inicial)
@app.route('/')
def index():
    return render_template('index.html')

# Rota da Página de Busca (Ver Pessoas Cadastradas)
@app.route('/busca')
def busca():
    return render_template('busca.html')

# Rota da Página Envolvidos (Para onde o PEX2025 deve linkar)
@app.route('/envolvidos')
def envolvidos():
    return render_template('envolvidos.html')

# NOVO: Rota da Página Fontes (Para onde o botão Fontes de Pesquisa deve linkar)
@app.route('/fontes')
def fontes():
    return render_template('fontes.html')

# Rota CONSOLIDADA de Cadastro (Exibir e Salvar)
@app.route('/cadastro', methods=['GET', 'POST']) 
def cadastro_completo():
    
    if request.method == 'POST':
        dados_form = request.form
        foto = request.files.get('foto')
        
        if not foto or foto.filename == '':
            return 'Erro: Foto não enviada ou arquivo inválido.', 400

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        nome_arquivo = f"{timestamp}_{foto.filename}"
        foto_path = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
        
        try:
            foto.save(foto_path)
        except Exception as e:
            print(f"ERRO AO SALVAR FOTO: {e}") 
            return f'Erro ao salvar a foto: {e}', 500

        dados = carregar_dados()
        proximo_id = str(len(dados) + 1).zfill(3)
        
        novo_registro = {
            "id": proximo_id,
            "nomeCompleto": dados_form.get('nome'),
            "dataNascimento": dados_form.get('data_nascimento'),
            # Linha adicionada: Captura o valor do campo 'telefone_contato' do formulário
            "telefoneContato": dados_form.get('telefone_contato'), 
            "sexo": "Não Informado", 
            "dataDesaparecimento": dados_form.get('data_desaparecimento'),
            "localDesaparecimento": {
                "cidade": dados_form.get('cidade'),
                "estado": dados_form.get('estado'),
                "pontoReferencia": dados_form.get('local_desaparecimento')
            },
            "caracteristicas": dados_form.get('caracteristicas'),
            "fotoUrl": os.path.join(UPLOAD_FOLDER, nome_arquivo).replace('\\', '/'), 
            "status": "Desaparecido"
        }

        dados.append(novo_registro)
        salvar_dados(dados)
        
        return redirect('/busca') 
    
    return render_template('cadastro.html')

# --- ROTA DE GESTÃO: Marcar Pessoa como Encontrada ---
@app.route('/marcar_encontrada/<id>', methods=['POST'])
def marcar_encontrada(id):
    dados = carregar_dados()
    
    # Procura a pessoa pelo ID
    pessoa_encontrada = None
    for pessoa in dados:
        if pessoa['id'] == id:
            pessoa_encontrada = pessoa
            break
            
    if pessoa_encontrada:
        # Altera o status
        pessoa_encontrada['status'] = 'Encontrada'
        salvar_dados(dados) # Salva a alteração no arquivo JSON
        return jsonify({"message": f"Pessoa com ID {id} marcada como Encontrada."}), 200
    else:
        return jsonify({"message": f"Pessoa com ID {id} não encontrada."}), 404
# --- FIM DA ROTA DE GESTÃO ---


# --- ROTA API DE BUSCA ---
@app.route('/api/dados', methods=['GET']) 
def get_dados_json():
    # 1. Carrega os dados mais recentes do JSON
    dados = carregar_dados()
    
    # 2. Converte para string JSON
    json_string = json.dumps(dados, indent=2, ensure_ascii=False)
    
    # 3. Retorna usando a classe Response do Flask, forçando o MIME Type correto.
    return Response(
        response=json_string,
        status=200,
        mimetype='application/json' 
    )
# --- FIM DA ROTA API DE BUSCA ---


if __name__ == '__main__':
    # Roda o servidor localmente
    app.run(debug=True)