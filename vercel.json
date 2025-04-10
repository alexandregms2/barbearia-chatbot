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
    
    console.log(`Buscando agendamentos para: ${dia}/${mes}/${ano}`);
    
    // Buscar todos os agendamentos existentes
    const snapshot = await db.collection("appointments").get();
    
    // Filtrar os agendamentos para hoje e agrupar por horário e barbeiro
    const agendamentosHoje = [];
    const horariosOcupados = {};
    
    snapshot.forEach(doc => {
      const appointment = doc.data();
      
      // Verificar se o appointment.date é um Timestamp do Firestore
      if (appointment.date && typeof appointment.date.toDate === 'function') {
        const appointmentDate = appointment.date.toDate();
        
        // Verificar se é para hoje - comparando data, mês e ano
        if (appointmentDate.getDate() === hoje.getDate() &&
            appointmentDate.getMonth() === hoje.getMonth() &&
            appointmentDate.getFullYear() === hoje.getFullYear()) {
          
          console.log(`Encontrado agendamento para hoje: barbeiro=${appointment.barber}, horário=${appointmentDate.getHours()}:${appointmentDate.getMinutes()}, serviço=${appointment.service}`);
          
          // Formatar a hora do agendamento (HH:MM)
          const hora = appointmentDate.getHours();
          const minutos = appointmentDate.getMinutes();
          const horaStr = `${hora}:${minutos === 0 ? '00' : minutos}`;
          
          // Adicionar ao objeto de horários ocupados
          if (!horariosOcupados[horaStr]) {
            horariosOcupados[horaStr] = [];
          }
          horariosOcupados[horaStr].push(appointment.barber);
          
          // Adicionar ao array de agendamentos
          agendamentosHoje.push({
            hora: horaStr,
            barbeiro: appointment.barber,
            servico: appointment.service,
            duracao: appointment.duration || 30 // Duração padrão de 30 minutos se não especificada
          });
        }
      }
    });
    
    console.log(`Agendamentos para hoje: ${JSON.stringify(agendamentosHoje)}`);
    console.log(`Horários ocupados: ${JSON.stringify(horariosOcupados)}`);
    
    // Verificar bloqueios de horário
    const blocksSnapshot = await db.collection("unavailableTimeBlocks").get();
    const blocksHoje = [];
    
    blocksSnapshot.forEach(doc => {
      const block = doc.data();
      
      // Verificar se o block.date é um Timestamp do Firestore
      if (block.date && typeof block.date.toDate === 'function') {
        const blockDate = block.date.toDate();
        
        // Verificar se é para hoje
        if (blockDate.getDate() === hoje.getDate() &&
            blockDate.getMonth() === hoje.getMonth() &&
            blockDate.getFullYear() === hoje.getFullYear()) {
          
          console.log(`Encontrado bloqueio para hoje: ${block.startTime} - ${block.endTime}, barbeiro=${block.barber}`);
          
          blocksHoje.push({
            inicio: block.startTime,
            fim: block.endTime,
            barbeiro: block.barber // 'all' ou um barbeiro específico
          });
        }
      }
    });
    
    // Considerar a duração dos agendamentos para bloquear horários corretamente
    // Por exemplo, um corte de 30 minutos iniciando às 9:00 bloqueia apenas 9:00
    // Um combo de 60 minutos iniciando às 9:00 bloqueia 9:00 e 9:30
    
    // Para cada agendamento, calcular todos os slots ocupados baseado na duração
    const slotsOcupados = {};
    agendamentosHoje.forEach(agendamento => {
      const [hora, minutos] = agendamento.hora.split(':').map(Number);
      const inicioMinutos = hora * 60 + minutos;
      const duracao = agendamento.duracao || 30;
      
      // Calcular quantos slots de 30 minutos serão ocupados
      const numSlots = Math.ceil(duracao / 30);
      
      for (let i = 0; i < numSlots; i++) {
        const slotMinutos = inicioMinutos + (i * 30);
        const slotHora = Math.floor(slotMinutos / 60);
        const slotMin = slotMinutos % 60;
        const slotStr = `${slotHora}:${slotMin === 0 ? '00' : slotMin}`;
        
        if (!slotsOcupados[slotStr]) {
          slotsOcupados[slotStr] = [];
        }
        if (!slotsOcupados[slotStr].includes(agendamento.barbeiro)) {
          slotsOcupados[slotStr].push(agendamento.barbeiro);
        }
      }
    });
    
    console.log(`Slots ocupados (considerando duração): ${JSON.stringify(slotsOcupados)}`);
    
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
        
        // Verificar slots ocupados (considerando duração)
        const slotOcupado = slotsOcupados[horario] && 
                           slotsOcupados[horario].includes(barbeiro);
        
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
        
        // Verificar se já passou da hora atual (não mostrar horários passados)
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minutoAtual = agora.getMinutes();
        const horarioJaPassou = (parseInt(hora) < horaAtual) || 
                               (parseInt(hora) === horaAtual && parseInt(minuto) < minutoAtual);
        
        return !horarioOcupado && !slotOcupado && !horarioBloqueado && !horarioJaPassou;
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
        
Segunda a Sexta: 09h às 20h
Sábado: 09h às 15h
Domingos: Fechado

Digite 5 para voltar ao menu principal.`);
        session.step = 'aguardando_retorno';
      } 
      else if (incomingMsg === '4') {
        // Localização
        twiml.message(`📍 Estamos localizados em:
        
R. Amador Bueno, 229 - Santo Amaro
São Paulo - SP
CEP: 04752-006

🗺️ Veja no mapa: https://maps.app.goo.gl/87WYrtrRsYf7Tfdz7

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
