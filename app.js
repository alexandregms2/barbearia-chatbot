// Webhook para Twilio WhatsApp com Express.js
// Salve como app.js

const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

// Configuração do Firebase
// Para produção, você deve usar variáveis de ambiente para estas credenciais
// NOTA: Você precisará baixar o arquivo de conta de serviço do console do Firebase
// em Configurações do Projeto > Contas de serviço > Gerar nova chave privada
const serviceAccount = {
  // Substitua com os dados do seu arquivo de credenciais baixado
  "type": "service_account",
  "project_id": "barbearia-app-alexandre",
  "private_key_id": "f64013ba306aaa08d7fdfe4ca159b00b00d580ad",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3WcE8dioZOghS\n+ToEd2pjyLEERAYK+pX8u2FjytRATFuMw72TbVmxKN+i+ASuPwIfyhKPb3zxoMtW\n81X7R2SywebhaviJUEQ4QN9p2zgCKoRmyyqLoEbwl7YV0S1ziCP7ViRI59vkoTvG\nSyz3YEsv2NHBUZ7ldGfISTBNMC3+gCjmbvqly7ZL2/R9JAIA+WKyziSl8EBsmxrS\n8LNNrkHM0FBV+dGOc2iL/Po5VJnwN6AvfJaI0FuftrJBr+lSRBAgpO3k6qSiu0KO\nAbL6++SFlGSRmV4ObkYJickJkUvi/7S9zBDKJNYGrhjX+XuQ3PHy3N2QI7oZuoLv\nKq/veTIpAgMBAAECggEAIbDd96i06qbFwc1nEkwJIiXOFT0UqS7LocGizy4Fm30M\nc4zCSJVW3l1m3rDZV1VfpAzDJVU0rcfApY0YNxCy2cAUl0ZLPhwgNQACrZZpL8i1\nRJg/jKGad3pBLLgftHOHPRdimnz0ZIoWDEVjEV/B4RxjyrSfUIV3zo9YT06znOiK\nnETpNCEGrlsryXTB0vtQ/malRk6YJf8MTzsJvJdBZgTj79Te7Vq7AT2qFzaa90D6\nBeuRTZiisGLFZe0u/zpLR33CMUOC1s7fF+8A1KpzPOutj0q0EAKiGzlkitcQ4BHN\nJFwQcry58mR9MzpSYxL6yz0b6GsBSBZPBULLqt86iwKBgQD1kZM0MC+PUnqtI3nC\nlAPJOyCIWVWV35wVeDL/HLfcsteRgdhO8G7gqHO+wXQtHUkOEjZTcxSMwnSp9SyO\nqz8oWCl56rt53c37Hhedy6oExhuqKd1IDJYVmICWwhNn4t8hT9Quj/CfrwnfU+AW\naEhjQuECjPSomntlNctfbRcaMwKBgQC/I5evsPJpKd9rwH/4XZOBN9Ogd4F0gsnD\nVOiwNpiVWfPFoGHdC1AFaFTbJpIzyqcznSkykxU+xt0KQBt3uYSiW+J8o7PDDhps\nL5Mp4vcwcjt2fz2SYivQ3lAbifEt1mIhlt1IiTH0e36bSavGjfEFpI9G5Xz8R5Hf\nEz6fAv8eMwKBgQDhFWvdvAT701fKdufV56GIwv9QusFtvCXur9veZc5JJkvcfS1t\nPYgDt6NPxzXbXCpoEV1mI+dEFcClP6p1opUjP5vUucjZLOruL2jqI5FVCti0oebH\ncXHnnX7PsFflMtfeSrNrclfVpbTg1JpjL3aaNOTVV6mxGNfdru8YKn+wbQKBgCtg\nj3cOyCS3nP2eJSyfR+9mVP+wv09KszFCHsCG01/plxn9iNgaTiG8CK3ndfyM/B8J\nhqT0njit9tHxtIoaLxCNm7u/hvc4RyTQMyypVoHHGtmMjNOgteLj4Pgu+O33HjQT\nQcrJX+3k7NmfAX3BDrbCHsXvJMs4DtG6U1bQ3kbjAoGBAOtEqJdhuq4l7krlgDt0\njdnGqwx4sJDVd9dZ/9kW50SuzczCdNj97tGour0X+RNxWFEbkzz43ec+GS2kcKjV\n1NWD/QMAoCdJQwjBswUCvIuajF/jqjo/4cOTDCMoXp4Iu/bvfGi8H8iWI6vMFmQC\nK3jditxuztV+xzvpDA34tITD\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@barbearia-app-alexandre.iam.gserviceaccount.com",
  "client_id": "115307478075992205627",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40barbearia-app-alexandre.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"

  // As outras informações virão do arquivo JSON baixado do Firebase
};

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "barbearia-app-alexandre"
});

const db = admin.firestore();

// Configurar Express
app.use(bodyParser.urlencoded({ extended: false }));

// Armazenar o estado das conversas
const sessions = {};

// Função para obter horários do Firebase
async function getHorariosDisponiveis() {
  try {
    // Obter a data de hoje
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    
    // Buscar todos os agendamentos existentes
    const snapshot = await db.collection("appointments").get();
    
    // Verificar se há agendamentos
    if (snapshot.empty) {
      return "Todos os horários estão disponíveis hoje. Entre 9:00 e 20:00";
    }
    
    // Filtrar os agendamentos para hoje e agrupar por horário e barbeiro
    const agendamentosHoje = [];
    const horariosOcupados = {};
    
    snapshot.forEach(doc => {
      const appointment = doc.data();
      
      // Verificar se o appointment.date é um Timestamp do Firestore
      if (appointment.date && typeof appointment.date.toDate === 'function') {
        const appointmentDate = appointment.date.toDate();
        
        // Verificar se é para hoje
        if (appointmentDate.getDate() == hoje.getDate() &&
            appointmentDate.getMonth() == hoje.getMonth() &&
            appointmentDate.getFullYear() == hoje.getFullYear()) {
          
          // Formatar a hora do agendamento (HH:MM)
          const hora = appointmentDate.getHours();
          const minutos = appointmentDate.getMinutes();
          const horaStr = `${hora}:${minutos === 0 ? '00' : minutos}`;
          
          // Adicionar ao objeto de horários ocupados
          if (!horariosOcupados[horaStr]) {
            horariosOcupados[horaStr] = [];
          }
          horariosOcupados[horaStr].push(appointment.barber);
          
          agendamentosHoje.push({
            hora: horaStr,
            barbeiro: appointment.barber,
            servico: appointment.service
          });
        }
      }
    });
    
    // Verificar bloqueios de horário
    const blocksSnapshot = await db.collection("unavailableTimeBlocks").get();
    const blocksHoje = [];
    
    blocksSnapshot.forEach(doc => {
      const block = doc.data();
      
      // Verificar se o block.date é um Timestamp do Firestore
      if (block.date && typeof block.date.toDate === 'function') {
        const blockDate = block.date.toDate();
        
        // Verificar se é para hoje
        if (blockDate.getDate() == hoje.getDate() &&
            blockDate.getMonth() == hoje.getMonth() &&
            blockDate.getFullYear() == hoje.getFullYear()) {
          
          blocksHoje.push({
            inicio: block.startTime,
            fim: block.endTime,
            barbeiro: block.barber // 'all' ou um barbeiro específico
          });
        }
      }
    });
    
    // Gerar lista de horários disponíveis
    const barbers = ["jonas", "jose"]; // Os barbeiros disponíveis conforme seu código
    const horariosFuncionamento = {
      inicio: 9,
      fim: 20
    };
    
    // Gerar todos os horários possíveis
    const todosHorarios = [];
    for (let hora = horariosFuncionamento.inicio; hora < horariosFuncionamento.fim; hora++) {
      todosHorarios.push(`${hora}:00`);
      if (hora < horariosFuncionamento.fim - 0.5) {
        todosHorarios.push(`${hora}:30`);
      }
    }
    
    // Filtrar horários disponíveis para cada barbeiro
    const horariosDisponiveis = {};
    
    barbers.forEach(barbeiro => {
      const disponiveis = todosHorarios.filter(horario => {
        // Verificar se o horário está ocupado para este barbeiro
        const [hora, minuto] = horario.split(':');
        
        // Verificar se há um agendamento para este horário e barbeiro
        const horarioOcupado = horariosOcupados[horario] && 
                              horariosOcupados[horario].includes(barbeiro);
        
        // Verificar se há um bloqueio de horário que afeta este barbeiro
        const horarioBloqueado = blocksHoje.some(block => {
          const [blockStartHour, blockStartMinute] = block.inicio.split(':');
          const [blockEndHour, blockEndMinute] = block.endTime.split(':');
          
          const blockStart = parseInt(blockStartHour) * 60 + parseInt(blockStartMinute);
          const blockEnd = parseInt(blockEndHour) * 60 + parseInt(blockEndMinute);
          const timeToCheck = parseInt(hora) * 60 + parseInt(minuto);
          
          return (block.barbeiro === 'all' || block.barbeiro === barbeiro) && 
                 (timeToCheck >= blockStart && timeToCheck < blockEnd);
        });
        
        return !horarioOcupado && !horarioBloqueado;
      });
      
      if (disponiveis.length > 0) {
        horariosDisponiveis[barbeiro] = disponiveis;
      }
    });
    
    // Formatar a resposta
    let resposta = "Horários disponíveis para hoje:\n\n";
    
    for (const barbeiro of barbers) {
      if (horariosDisponiveis[barbeiro] && horariosDisponiveis[barbeiro].length > 0) {
        resposta += `${barbeiro === 'jonas' ? 'Barbeiro Jonas' : 'Barbeiro José'}:\n`;
        resposta += horariosDisponiveis[barbeiro].join(', ') + "\n\n";
      }
    }
    
    if (Object.keys(horariosDisponiveis).length === 0) {
      resposta = "Não há horários disponíveis para hoje.";
    }
    
    return resposta;
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    return "Desculpe, não foi possível consultar os horários disponíveis. Erro: " + error.message;
  }
}

// Função para obter serviços e valores
async function getServicosValores() {
  try {
    // Definir os serviços diretamente com base no seu código
    const services = [
      { id: "corte", name: "Somente Corte", duration: 30, price: 35 },
      { id: "barba", name: "Somente Barba", duration: 30, price: 25 },
      { id: "combo", name: "Combo (Corte e Barba)", duration: 60, price: 55 }
    ];
    
    if (services.length === 0) {
      return "Não há serviços cadastrados.";
    }
    
    let servicos = "Nossos serviços e valores:\n\n";
    services.forEach(service => {
      servicos += `- ${service.name}: R$ ${service.price.toFixed(2)} (${service.duration} minutos)\n`;
    });
    
    return servicos;
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return "Desculpe, não foi possível consultar os serviços e valores. Erro: " + error.message;
  }
}

// Rota principal para receber mensagens do WhatsApp via Twilio
app.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body.trim().toLowerCase();
  const whatsappNumber = req.body.From; // número do WhatsApp no formato whatsapp:+5511999999999
  
  // Inicializar sessão se não existir
  if (!sessions[whatsappNumber]) {
    sessions[whatsappNumber] = { step: 'inicio' };
  }
  
  const session = sessions[whatsappNumber];
  
  // Processar a conversa baseado no estado atual
  switch(session.step) {
    case 'inicio':
      // Enviar menu inicial
      twiml.message(`👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
      
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`);
      
      session.step = 'menu_principal';
      break;
      
    case 'menu_principal':
      // Processar escolha do menu principal
      if (incomingMsg === '1') {
        // Buscar horários no Firebase
        const horarios = await getHorariosDisponiveis();
        twiml.message(`${horarios}\n\nDigite 5 para voltar ao menu principal.`);
        session.step = 'aguardando_retorno';
      } 
      else if (incomingMsg === '2') {
        // Buscar serviços e valores
        const servicos = await getServicosValores();
        twiml.message(`${servicos}\n\nDigite 5 para voltar ao menu principal.`);
        session.step = 'aguardando_retorno';
      } 
      else if (incomingMsg === '3') {
        // Horário de funcionamento
        twiml.message(`⏰ Nosso horário de funcionamento:
        
Segunda a Sexta: 9h às 20h
Sábados: 9h às 18h
Domingos: Fechado

Digite 5 para voltar ao menu principal.`);
        session.step = 'aguardando_retorno';
      } 
      else if (incomingMsg === '4') {
        // Localização
        twiml.message(`📍 Estamos localizados em:
        
Rua dos Barbeiros, 123
São Paulo - SP
CEP: 01234-567

🗺️ Veja no mapa: https://maps.app.goo.gl/abcd1234

Digite 5 para voltar ao menu principal.`);
        session.step = 'aguardando_retorno';
      } 
      else if (incomingMsg === '5') {
        // Voltar ao menu principal
        twiml.message(`👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
        
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`);
        session.step = 'menu_principal';
      } 
      else {
        // Resposta para mensagem não reconhecida
        twiml.message(`Desculpe, não entendi. Por favor, escolha uma opção digitando o número correspondente:
        
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`);
      }
      break;
      
    case 'aguardando_retorno':
      // Retorno ao menu principal
      if (incomingMsg === '5') {
        twiml.message(`👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
        
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`);
        session.step = 'menu_principal';
      } 
      else {
        twiml.message(`Para voltar ao menu principal, digite 5.`);
      }
      break;
      
    default:
      // Reset da sessão
      session.step = 'inicio';
      twiml.message(`👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
      
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`);
      
      session.step = 'menu_principal';
  }
  
  // Responder ao Twilio
  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

// Rota para verificar se o servidor está rodando
app.get('/', (req, res) => {
  res.send('Webhook do WhatsApp da Barbearia Alexandre está funcionando!');
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
