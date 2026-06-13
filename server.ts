import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { PREDEFINED_EVENTS } from './src/predefinedEvents';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Initialize Gemini Client Lazily/Safely so missing key doesn't crash app on start
let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

function getAiClient() {
  if (!aiClient && apiKey) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Falha ao inicializar cliente do Gemini:', err);
    }
  }
  return aiClient;
}

// Endpoint status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    time: new Date().toISOString()
  });
});

// Endpoint: Generate dynamic AI geopolitical raw events
app.post('/api/generate-event', async (req, res) => {
  const { turn, popularity, stability, allianceSupport, resources, provincesSummary, playerCountry } = req.body;
  
  const client = getAiClient();
  if (!client) {
    // If no API key or client, return a random predefined event as an elegant developer fallback
    console.log('Gemini API não configurada ou vazia. Utilizando eventos pré-definidos (Fallback).');
    const randomIndex = Math.floor(Math.random() * PREDEFINED_EVENTS.length);
    return res.json(PREDEFINED_EVENTS[randomIndex]);
  }

  try {
    const prompt = `Você é o gerador de IA narrativa para o jogo 'Guerra Brasil-Paraguai: Grand Strategy', focado no conflito de 2026/2027.
O jogador está controlando a nação: ${playerCountry}.
Status da Campanha Atual:
- Turno Corrente: ${turn}
- Popularidade de Governo: ${popularity}%
- Estabilidade Social: ${stability}%
- Diplomacia Externa / Apoio Aliado: ${allianceSupport}%
- Força de Recursos Actuais: Dinheiro: R$ ${resources.money}B, Aço: ${resources.steel}MT, Petróleo: ${resources.oil} bbl, Suprimento de Alimentos: ${resources.food}ton.
- Resumo do Fronte/Províncias ativas do jogador: ${provincesSummary}

Instruções:
Por favor, crie um evento dinâmico de geopolítica ou tática militar em PORTUGUÊS realista e de alto impacto que se adeque a essas circunstâncias exatas.
- Dê um título militar/civil forte.
- Crie um parágrafo narrativo bem contextualizado em português detalhando a crise financeira, agitação civil, dilema ético, sabotagem de espiões inimigos, aliança diplomática ruidosa ou problema militar.
- Elabore exatamente Duas opções de escolha estratégica com impacto correspondente sobre finanças (money), aço (steel), petróleo (oil), alimentos (food), popularidade e estabilidade. Mantenha os números equilibrados (ex: variações de -50 a +50 para recursos, -25 a +25 para estabilidade/popularidade).
Retorne no formato JSON correspondente ao esquema solicitado.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Você é um motor de IA militar de jogos grand strategy focado em narrativas sérias, realistas, táticas e sombrias (similar às crises geopolíticas e diplomáticas de Hearts of Iron ou Victoria 3, sem caricaturas ou piadas). Responda sempre em português brasileiro de forma imersiva.',
        temperature: 0.9,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Título curto e chamativo para o evento geopolítico/militar.',
            },
            description: {
              type: Type.STRING,
              description: 'Texto imersivo em português brasileiro detalhando as especificidades e a tensão do evento.',
            },
            choices: {
              type: Type.ARRAY,
              description: 'Exatamente duas escolhas estratégicas oferecidas ao jogador.',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: 'Ação imediata recomendada (ex: "Enviar auxílio militar imediato").',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Explanação tática do que acontece ao escolher isso.',
                  },
                  effects: {
                    type: Type.OBJECT,
                    properties: {
                      resources: {
                        type: Type.OBJECT,
                        properties: {
                          money: { type: Type.INTEGER, description: 'Mudança no dinheiro (positivo ou negativo) ex: -15 ou +20' },
                          steel: { type: Type.INTEGER, description: 'Mudança no suprimento de Aço' },
                          oil: { type: Type.INTEGER, description: 'Mudança no combustível/petróleo' },
                          food: { type: Type.INTEGER, description: 'Mudança nos estoques de alimento' },
                        }
                      },
                      popularity: { type: Type.INTEGER, description: 'Impacto na popularidade do presidente em pontos (-100 a +100)' },
                      stability: { type: Type.INTEGER, description: 'Impacto na estabilidade social da nação' },
                    },
                    required: ['popularity', 'stability']
                  }
                },
                required: ['text', 'description', 'effects']
              }
            }
          },
          required: ['title', 'description', 'choices']
        }
      }
    });

    const textResponse = response.text;
    if (textResponse) {
      const gEvent = JSON.parse(textResponse.trim());
      // Assign fake ID to match type
      gEvent.id = 'ai_event_' + Date.now();
      return res.json(gEvent);
    } else {
      throw new Error('Retorno vazio do Gemini API');
    }
  } catch (error) {
    console.error('Erro na chamada do Gemini API (gerar evento):', error);
    // Graceful fallback on error
    const randomIndex = Math.floor(Math.random() * PREDEFINED_EVENTS.length);
    return res.json(PREDEFINED_EVENTS[randomIndex]);
  }
});

// Endpoint: Geopolitical Strategist military advisor (Chief of Staff / General de Campo)
app.post('/api/advisor', async (req, res) => {
  const { turn, popularity, stability, resources, playerCountry, opponentDetails, logSlice } = req.body;
  
  const client = getAiClient();
  if (!client) {
    return res.json({
      advisor: 'Conselho Tático Militar: Comandante, nossas comunicações via satélite estão sob forte interferência eletromagnética (Gemini offline/sem chave). Foque em suprir suas províncias de fronteira, mobilize blindados e assegure refinarias de petróleo no Mato Grosso do Sul ou no Chaco para manter sua frota mecânica operacional. Cale revoltas populares de imediato elevando o suprimento de alimento nas províncias agrícolas.'
    });
  }

  try {
    const prompt = `Você é o General de Divisão e Diretor de Estratégia do Exército do país ${playerCountry}.
Estamos no turno ${turn} do teatro de operações na Bacia do Prata contra o Paraguai. 
Status da Economia e Mobilização:
- Dinheiro: R$ ${resources.money}B | Aço: ${resources.steel}MT | Petróleo: ${resources.oil} bbl | Alimentos: ${resources.food}ton.
- Popularidade de nossa administração: ${popularity}% | Estabilidade da Retaguarda: ${stability}%.
Recentes eventos táticos em combate:
${JSON.stringify(logSlice)}

Status militar do oponente e províncias:
${opponentDetails}

Por favor, elabore um curto e ríspido conselho militar e econômico (máximo de 3-4 frases curtas e altamente profissionais) em português brasileiro do ponto de vista de um estrategista tarimbado. Ele quer que você vença! Diga se devemos focar em infantaria na defesa, avançar tanques pesados, focar em indústrias petroleiras, manter a moral popular estável, ou recuar para reestabelecer as linhas de logística.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Você é o conselheiro chefe militar do Alto Comando. Seu estilo de redação é sério, pragmático, lacônico, disciplinado e de enorme peso geopolítico.',
        temperature: 0.85
      }
    });

    const advisorText = response.text || 'Nossas linhas estão estiradas demais, Comandante. Recomendo focar em fortificar indústrias e estocar petróleo na fronteira.';
    return res.json({ advisor: advisorText.trim() });
  } catch (error) {
    console.error('Erro no conselheiro da IA (Gemini):', error);
    return res.json({
      advisor: 'Aviso urgente de fronteira: Devido ao mau tempo nas torres de comunicação, aconselhamos estrita cautela administrativa imediata. Proteja nossas principais fontes industriais e restabeleça o estoque petrolífero.'
    });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Grand Strategy Server] Ativo em http://0.0.0.0:${PORT} no modo ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
