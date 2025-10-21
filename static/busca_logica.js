let pessoasDesaparecidas = [];
const resultadosDiv = document.getElementById('resultados');

// Função principal para carregar o JSON ATUALIZADO do servidor
async function carregarDados() {
    // 1. Limpa a área de resultados para mostrar o estado de carregamento/erro
    resultadosDiv.innerHTML = '<p>Carregando dados...</p>';

    try {
        // Faz a requisição para buscar os dados na rota do Flask
        const response = await fetch('/api/dados'); 
        
        // Verifica se a requisição foi bem-sucedida (código 200 OK)
        if (!response.ok) {
            const erroDetalhe = `Status: ${response.status} - Verifique o terminal do Flask para detalhes do erro.`;
            throw new Error(`Erro ao carregar os dados: ${erroDetalhe}`);
        }
        
        // Transforma o conteúdo em um objeto JavaScript (array)
        pessoasDesaparecidas = await response.json();
        
        // Exibe a lista completa
        exibirPessoas(pessoasDesaparecidas);

    } catch (error) {
        // Se a requisição falhou (erro de rede ou bloqueio CORS)
        console.error("ERRO FATAL: Falha na comunicação com a API do Flask. Detalhes:", error);
        
        // Mensagem de erro clara para o usuário
        resultadosDiv.innerHTML = `
            <p style="color: #ff4e59; font-weight: bold;">
                ❌ Não foi possível carregar os dados. 
            </p>
            <p style="font-size: 0.9em; color: #ccc;">
                Verifique se o **app.py** está rodando no seu terminal (porta 5000) e se a URL é **http://127.0.0.1:5000/busca**.
            </p>
            <p style="font-size: 0.8em; color: #888;">Detalhe técnico: ${error.message || error}</p>
        `;
    }
}

// Função para exibir as pessoas na tela (cria os cards HTML)
function exibirPessoas(lista) {
    if (lista.length === 0) {
        resultadosDiv.innerHTML = '<p style="color: #ccc;">Nenhuma pessoa desaparecida cadastrada ou nenhum resultado encontrado com os filtros aplicados.</p>';
        return;
    }

    const htmlCards = lista.map(pessoa => {
        // Garante que a data de desaparecimento seja exibida corretamente
        const dataDesapApenas = pessoa.dataDesaparecimento ? pessoa.dataDesaparecimento.split('T')[0] : 'Data Desconhecida';
        
        // Corrigindo o caminho da foto (deve ter um / no início para ser relativo à raiz)
        const fotoPath = pessoa.fotoUrl.startsWith('/') ? pessoa.fotoUrl : `/${pessoa.fotoUrl}`;
        
        // Define a cor do status (mantendo a lógica do JavaScript anterior)
        const statusCor = pessoa.status.toUpperCase() === 'DESAPARECIDO' ? '#ff4e59' : '#00cc00'; // Alterando para o vermelho neon e um verde forte
        const statusText = pessoa.status.toUpperCase();


        // UTILIZANDO A ESTRUTURA DE CLASSES DO NOVO CSS (busca.css)
        return `
            <div class="card-pessoa">
                <img src="${fotoPath}" alt="Foto de ${pessoa.nomeCompleto}" class="foto-card">
                
                <div class="card-conteudo">
                    <h2>${pessoa.nomeCompleto}</h2>

                    <p class="detalhe-linha">
                        <span class="detalhe-label">Nascimento:</span> 
                        <span class="detalhe-valor">${pessoa.dataNascimento || 'Não Informado'}</span>
                    </p>

                    <p class="detalhe-linha">
                        <span class="detalhe-label">Contato:</span> 
                        <span class="detalhe-valor">${pessoa.telefoneContato || 'Não Informado'}</span>
                    </p>
                    
                    <p class="detalhe-linha">
                        <span class="detalhe-label">Desapareceu em:</span> 
                        <span class="detalhe-valor">${dataDesapApenas}</span>
                    </p>
                    <p class="detalhe-linha">
                        <span class="detalhe-label">Local:</span> 
                        <span class="detalhe-valor">${pessoa.localDesaparecimento.cidade} - ${pessoa.localDesaparecimento.estado}</span>
                    </p>
                    <p class="detalhe-linha">
                        <span class="detalhe-label">Características:</span> 
                        <span class="detalhe-valor">${pessoa.caracteristicas || 'N/A'}</span>
                    </p>
                    
                    <p class="status-alerta status-desaparecido" style="color: ${statusCor};">STATUS: ${statusText}</p>

                    ${statusText === 'DESAPARECIDO' ? 
                        `<button class="btn-encontrada" data-id="${pessoa.id}" onclick="marcarComoEncontrada('${pessoa.id}')">
                            Marcar como Encontrada
                        </button>` : 
                        `<p style="color: green; font-weight: bold; text-align: center; margin-top: 20px;">✅ PESSOA ENCONTRADA</p>`
                    }
                </div>
            </div>
        `;
    }).join('');

    // Insere os cards no container de resultados
    resultadosDiv.innerHTML = htmlCards;
}

// Função de Busca e Filtragem (ativada ao digitar)
function filtrarPessoas() {
    const termoBusca = document.getElementById('campoBusca').value.toLowerCase();

    // Filtra o array `pessoasDesaparecidas`
    const resultadosFiltrados = pessoasDesaparecidas.filter(pessoa => {
        const nome = pessoa.nomeCompleto ? pessoa.nomeCompleto.toLowerCase() : '';
        const cidade = pessoa.localDesaparecimento.cidade ? pessoa.localDesaparecimento.cidade.toLowerCase() : '';
        const estado = pessoa.localDesaparecimento.estado ? pessoa.localDesaparecimento.estado.toLowerCase() : '';
        const contato = pessoa.telefoneContato ? pessoa.telefoneContato.toLowerCase() : ''; // Opcional: buscar por contato
        
        // Retorna TRUE se o termo de busca estiver no nome, na cidade ou no estado
        return nome.includes(termoBusca) || 
               cidade.includes(termoBusca) || 
               estado.includes(termoBusca) ||
               contato.includes(termoBusca);
    });

    // Exibe apenas os resultados filtrados
    exibirPessoas(resultadosFiltrados);
}

// --- FUNÇÃO PARA MARCAR COMO ENCONTRADA (NOVO) ---
async function marcarComoEncontrada(pessoaId) {
    // Confirmação para evitar cliques acidentais
    if (!confirm("Tem certeza que deseja marcar esta pessoa como ENCONTRADA?")) {
        return; 
    }

    try {
        // Envia uma requisição POST para a rota do Flask
        const response = await fetch(`/marcar_encontrada/${pessoaId}`, {
            method: 'POST' // O Flask espera um método POST
        });

        if (response.ok) {
            // Se o Flask retornar 200, recarrega a lista para atualizar o status
            alert("Pessoa marcada como ENCONTRADA com sucesso!");
            carregarDados(); 
        } else {
            // Exibe mensagem de erro se a requisição falhar no servidor
            alert(`Erro ao marcar como encontrada: ${response.status}. Verifique o terminal do Flask.`);
        }
    } catch (error) {
        console.error("Erro na comunicação com o servidor:", error);
        alert("Falha na comunicação com o Flask. Verifique o console do navegador.");
    }
}
// --- FIM DA FUNÇÃO NOVA ---


// Inicia o carregamento dos dados quando a página carrega
carregarDados();

// Adiciona o listener de busca (se o campoBusca existir)
document.addEventListener('DOMContentLoaded', () => {
    const campoBusca = document.getElementById('campoBusca');
    if (campoBusca) {
        campoBusca.addEventListener('input', filtrarPessoas);
    }
});