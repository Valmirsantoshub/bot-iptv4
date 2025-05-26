const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const config = require('./config.json');

const filePath = './usuarios.json';
let usuarios = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            iniciarBot();
        } else if (connection === 'open') {
            console.log(`✅ ${config.botName} conectado ao WhatsApp`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const de = msg.key.remoteJid;
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const nome = msg.pushName || 'Cliente';

        if (!usuarios[de]) usuarios[de] = { nome, emAtendimento: false };

        const msgLower = texto.trim().toLowerCase();

        if (usuarios[de].emAtendimento) {
            if (['menu', 'voltar', 'cancelar'].includes(msgLower)) {
                usuarios[de].emAtendimento = false;
                await simularDigitacao(de);
                await sock.sendMessage(de, { text: config.replyMessages.menuEncerrado });
                return exibirMenu(de);
            } else {
                return; // atendimento humano ativo, bot silenciado
            }
        }

        if (['menu', 'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'ola'].includes(msgLower)) {
            return exibirMenu(de);
        }

        switch (msgLower) {
            case '1':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: config.replyMessages.planos });

            case '2':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: config.replyMessages.pagamento });

            case 'pix':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: '🔑 Nossa chave Pix é:\n*chavepix@exemplo.com*' });

            case 'boleto':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: '🧾 Clique no link para gerar o boleto:\nhttps://exemplo.com/boleto' });

            case 'cartão':
            case 'cartao':
            case 'crédito':
            case 'credito':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: '💳 Faça o pagamento por cartão no link:\nhttps://exemplo.com/cartao' });

            case '3':
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: config.replyMessages.problemasComum.travando });

            case '4':
                usuarios[de].emAtendimento = true;
                await simularDigitacao(de);
                return sock.sendMessage(de, { text: config.replyMessages.humanSupport });

            default:
                // suporte técnico automático por palavras-chave
                if (texto.includes('travando')) {
                    await simularDigitacao(de);
                    return sock.sendMessage(de, { text: config.replyMessages.problemasComum.travando });
                } else if (texto.includes('sem canal') || texto.includes('sumiu')) {
                    await simularDigitacao(de);
                    return sock.sendMessage(de, { text: config.replyMessages.problemasComum['sem Canal'] });
                } else if (texto.includes('erro') || texto.includes('mensagem')) {
                    await simularDigitacao(de);
                    return sock.sendMessage(de, { text: config.replyMessages.problemasComum.erro });
                } else {
                    await simularDigitacao(de);
                    return sock.sendMessage(de, { text: config.replyMessages.invalidOption });
                }
        }
    });

    async function exibirMenu(jid) {
        await simularDigitacao(jid);
        return sock.sendMessage(jid, { text: config.replyMessages.menu });
    }

    async function simularDigitacao(jid) {
        await sock.sendPresenceUpdate('composing', jid);
        await delay(1500);
        await sock.sendPresenceUpdate('paused', jid);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

iniciarBot();
