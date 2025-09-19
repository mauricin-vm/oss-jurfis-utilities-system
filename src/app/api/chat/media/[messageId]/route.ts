//importar bibliotecas e funções
import { NextRequest, NextResponse } from 'next/server';

//definir variáveis de ambiente
const WPPCONNECT_SERVER_URL = process.env.WPPCONNECT_SERVER_URL || `http://localhost:21465`;
const SESSION_NAME = process.env.WHATSAPP_SESSION_NAME || `jurfis`;
const BEARER_TOKEN = process.env.WPPCONNECT_TOKEN || ``;

//função de GET (carregar mídia)
export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params;

    console.log(`Tentando buscar mídia para mensagem ${messageId}`);
    const mediaUrl = `${WPPCONNECT_SERVER_URL}/api/${SESSION_NAME}/get-media-by-message/${messageId}`;
    console.log(`URL da mídia: ${mediaUrl}`);

    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Erro ao buscar mídia: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Resposta de erro:`, errorText);
      throw new Error(`Falha ao carregar mídia do servidor wppconnect!`);
    }

    const mediaData = await response.json();

    // Extrair base64 puro se vier com prefixo data:
    let cleanBase64 = mediaData.base64;
    if (typeof cleanBase64 === 'string' && cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,').pop() || cleanBase64;
    }

    return NextResponse.json({
      success: true,
      base64: cleanBase64,
      mimetype: mediaData.mimetype,
      caption: mediaData.caption || null
    });

  } catch (error) {
    console.error(`Erro ao carregar mídia:`, error);
    return NextResponse.json({
      success: false,
      error: `Falha ao carregar mídia`,
      details: error instanceof Error ? error.message : `Erro desconhecido.`
    }, { status: 500 });
  }
};