// Webhook para WhatsApp com Express.js
// Suporta tanto Twilio quanto WhatsApp Business API
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

// Configuração do Firebase
// Para produção, você deve usar variáveis de ambiente para estas credenciais
const serviceAccount = {
  // Substitua com os dados do seu arquivo de credenciais baixado
  "type": "service_account",
  "apiKey": "AIzaSyCy3jzA0D5py-ZFf4O6ZBhVoJe8GVV2cNU",
  "authDomain": "barbearia-app-alexandre.firebaseapp.com",
  "projectId": "barbearia-app-alexandre",
  "storageBucket": "barbearia-app-alexandre.firebasestorage.app",
  "messagingSenderId": "812007017611",
  "appId": "1:812007017611:web:e537e0a2c70afda98c988e",
  "measurementId": "G-GBN5DN49QW"
  
  // Seus outros dados de credenciais aqui
};

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "barbearia-app-alexandre"
});

const db = admin.firestore();

// Configurar Express para Twilio e WhatsApp Business API
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Necessário para WhatsApp Business API

// Armazenar o estado das conversas
const sessions = {};

// Configurações do WhatsApp Business API
// Substitua estes valores pelos seus reais do Facebook Developer Dashboard
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "SEU_TOKEN_PERMANENTE_AQUI";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "SEU_PHONE_NUMBER_ID_AQUI";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "minhasenhasecreta2024"; // Mesmo token usado na configuração do webhook
// Função para enviar mensagem via WhatsApp Business API
async function sendWhatsAppMessage(to, message) {
  try {
    // Remover o formato "whatsapp:" e outras formatações, se presente
    if (to.startsWith('whatsapp:')) {
      to = to.replace('whatsapp:', '');
    }
    
    // Remover caracteres não numéricos
    to = to.replace(/\D/g, '');
    
    // Adicionar o código do país se não estiver presente
    if (!to.startsWith('55') && to.length === 11) {
      to = '55' + to;
    }
    
    console.log(`Enviando mensagem para ${to}: ${message}`);
    
    // Se você já tem axios instalado e importado:
    /*
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Mensagem enviada com sucesso:', response.data);
    return response.data;
    */
    
    // Versão simplificada para testes:
    console.log(`[SIMULAÇÃO] Mensagem enviada para ${to}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}
// Rota para verificação do webhook (GET) - WhatsApp Business API
app.get('/webhook', (req, res) => {
  console.log("Recebida solicitação de verificação do webhook");
  console.log("Query params:", req.query);
  
  // Parse params da URL
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Verificar se token e mode existem
  if (mode && token) {
    // Verificar se mode e token são válidos
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responder com o desafio
      console.log("WEBHOOK_VERIFICADO");
      res.status(200).send(challenge);
    } else {
      // Responder com erro 403 se tokens não correspondem
      console.log("VERIFICAÇÃO FALHOU: tokens não correspondem");
      res.sendStatus(403);
    }
  } else {
    // Responder com bad request se faltam parâmetros
    console.log("VERIFICAÇÃO FALHOU: faltando parâmetros obrigatórios");
    res.sendStatus(400);
  }
});

// Rota para verificar se o servidor está rodando
app.get('/', (req, res) => {
  res.send('Webhook do WhatsApp da Barbearia Alexandre está funcionando!');
});
// Rota principal para receber mensagens do WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    console.log("Recebida requisição webhook:", JSON.stringify(req.body));
    
    // Determinando formato da mensagem (Twilio ou WhatsApp Business)
    let incomingMsg = '';
    let whatsappNumber = '';
    
    // Se for do Twilio
    if (req.body.Body && req.body.From) {
      incomingMsg = req.body.Body.trim().toLowerCase();
      whatsappNumber = req.body.From; // número no formato whatsapp:+5511999999999
      console.log(`Mensagem Twilio recebida: ${incomingMsg} de ${whatsappNumber}`);
    } 
    // Se for do WhatsApp Business API
    else if (req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value.messages) {
      const messages = req.body.entry[0].changes[0].value.messages;
      if (messages && messages.length > 0) {
        incomingMsg = messages[0].text.body.trim().toLowerCase();
        whatsappNumber = messages[0].from;
        console.log(`Mensagem WhatsApp Business recebida: ${incomingMsg} de ${whatsappNumber}`);
      }
    }
    // Formato desconhecido
    else {
      console.log("Formato de mensagem não reconhecido");
      return res.status(200).send("OK");
    }
    
    // Se não conseguimos extrair a mensagem ou número, retornar
    if (!incomingMsg || !whatsappNumber) {
      console.log("Mensagem ou número não encontrados na requisição");
      return res.status(200).send("OK");
    }
    
    // Verificar se é uma mensagem do número específico (para teste com WhatsApp Business)
    const numeroBarbeariaWhatsApp = "+5511917412569"; // Seu número de WhatsApp Business
    if (whatsappNumber.includes(numeroBarbeariaWhatsApp) || whatsappNumber === numeroBarbeariaWhatsApp) {
      console.log("Mensagem recebida do número da barbearia - ignorando para evitar loop");
      return res.status(200).send("OK");
    }
    
    // Inicializar sessão se não existir
    if (!sessions[whatsappNumber]) {
      sessions[whatsappNumber] = { step: 'inicio' };
    }
    
    const session = sessions[whatsappNumber];
    let responseMessage = '';
    
    // Processar a conversa baseado no estado atual
    switch(session.step) {
      case 'inicio':
        // Enviar menu inicial
        responseMessage = `👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
        
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`;
        
        session.step = 'menu_principal';
        break;
        
      case 'menu_principal':
        // Processar escolha do menu principal
        if (incomingMsg === '1') {
          // Buscar horários no Firebase
          const horarios = await getHorariosDisponiveis();
          responseMessage = `${horarios}\n\nDigite 5 para voltar ao menu principal.`;
          session.step = 'aguardando_retorno';
        } 
        else if (incomingMsg === '2') {
          // Buscar serviços e valores
          const servicos = await getServicosValores();
          responseMessage = `${servicos}\n\nDigite 5 para voltar ao menu principal.`;
          session.step = 'aguardando_retorno';
        } 
        else if (incomingMsg === '3') {
          // Horário de funcionamento
          responseMessage = `⏰ Nosso horário de funcionamento:
          
Segunda a Sexta: 09h às 20h
Sábado: 09h às 15h
Domingos: Fechado

Digite 5 para voltar ao menu principal.`;
          session.step = 'aguardando_retorno';
        } 
        else if (incomingMsg === '4') {
          // Localização
          responseMessage = `📍 Estamos localizados em:
          
R. Amador Bueno, 229 - Santo Amaro
São Paulo - SP
CEP: 04752-006

🗺️ Veja no mapa: https://maps.app.goo.gl/87WYrtrRsYf7Tfdz7

Digite 5 para voltar ao menu principal.`;
          session.step = 'aguardando_retorno';
        } 
        else if (incomingMsg === '5') {
          // Voltar ao menu principal
          responseMessage = `👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
          
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`;
          session.step = 'menu_principal';
        } 
        else {
          // Resposta para mensagem não reconhecida
          responseMessage = `Desculpe, não entendi. Por favor, escolha uma opção digitando o número correspondente:
          
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`;
        }
        break;
        
      case 'aguardando_retorno':
        // Retorno ao menu principal
        if (incomingMsg === '5') {
          responseMessage = `👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
          
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`;
          session.step = 'menu_principal';
        } 
        else {
          responseMessage = `Para voltar ao menu principal, digite 5.`;
        }
        break;
        
      default:
        // Reset da sessão
        session.step = 'inicio';
        responseMessage = `👋 Olá! Bem-vindo à Barbearia Alexandre. Escolha uma opção:
        
1 - Horários disponíveis hoje
2 - Serviços e valores
3 - Horário de funcionamento
4 - Localização`;
        
        session.step = 'menu_principal';
    }
    
    // Enviar resposta (formato depende da origem)
    if (req.body.Body && req.body.From) {
      // Resposta para Twilio
      const twiml = new MessagingResponse();
      twiml.message(responseMessage);
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml.toString());
    } else {
      // Resposta para WhatsApp Business API
      try {
        await sendWhatsAppMessage(whatsappNumber, responseMessage);
        res.status(200).send("OK");
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).send("Erro ao enviar mensagem");
      }
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    res.status(500).send("Erro interno");
  }
});
// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Token de verificação: ${VERIFY_TOKEN}`);
});