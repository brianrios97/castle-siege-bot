require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, Events, MessageFlags
} = require('discord.js');
const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const https = require('https');

// ─── Error handling ───────────────────────────────────────────────────────────
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught exception:', err));

// ─── Config ───────────────────────────────────────────────────────────────────
const DATA_PATH   = path.join(__dirname, 'data', 'parties.json');
const CHANNEL_ID  = process.env.CHANNEL_ID;
const GUILD_ID    = process.env.GUILD_ID;
const MAX_MEMBERS = 5;

// ─── Class meta ───────────────────────────────────────────────────────────────
const CLASS_META = {
  inner : { label: 'Inner BK',    emoji: '🛡️',  short: 'BK'    },
  mg    : { label: 'Inner MG',    emoji: '⚡',   short: 'MG'    },
  elf   : { label: 'Elf',         emoji: '🌿',   short: 'Elf'   },
  dl    : { label: 'Dark Lord',   emoji: '👑',   short: 'DL'    },
  sm    : { label: 'Soul Master', emoji: '🔮',   short: 'SM'    },
  none  : { label: 'Sin definir', emoji: '❓',   short: '?'     },
};

function parseClassInput(input) {
  if (!input) return 'none';
  const clean = input.trim().toLowerCase();
  if (clean.includes('bk') || clean.includes('knight') || clean.includes('inner bk')) return 'inner';
  if (clean.includes('mg') || clean.includes('gladiator') || clean.includes('inner mg')) return 'mg';
  if (clean.includes('elf') || clean.includes('muse') || clean.includes('ee') || clean.includes('ae')) return 'elf';
  if (clean.includes('dl') || clean.includes('dark lord') || clean.includes('lord')) return 'dl';
  if (clean.includes('sm') || clean.includes('soul') || clean.includes('master') || clean.includes('dw')) return 'sm';
  if (clean.includes('inner')) return 'inner';
  return 'none';
}

// ─── Initial State Snapshot (Preserva los 19 jugadores del CS) ────────────────
const DEFAULT_INITIAL_STATE = {
  parties: [
    { id: "party_1", name: "Party 1", members: ["709092274281119804", "1385770674303537155", "1353493332436975689", "1167689767404716112"], fixed: false },
    { id: "party_2", name: "Party 2", members: ["356496336079552525", "1558929388760858644", "1329901199457128489"], fixed: false },
    { id: "party_3", name: "Party 3", members: ["1013977109397516328", "706734124337201172", "925222969993723904", "1407618804535660564"], fixed: false },
    { id: "party_4", name: "Party 4", members: ["472880105715269642", "783100111088517151"], fixed: false },
    { id: "party_5", name: "Party 5", members: ["1270553622509260850"], fixed: false },
    { id: "party_6", name: "Party 6", members: [], fixed: false },
    { id: "party_7", name: "Party 7", members: [], fixed: false },
    { id: "party_8", name: "Party 8", members: ["280142109623844864", "1353509863753252914", "1428899666300239926", "830705180760211466"], fixed: false },
    { id: "party_9", name: "Party 9", members: [], fixed: false }
  ],
  players: {
    "709092274281119804": { name: "Bahamoth", class: "dl", discordTag: "fazzitto." },
    "356496336079552525": { name: "Mustang", class: "sm", discordTag: "brianr3331" },
    "1385770674303537155": { name: "GOROAZTEKA", class: "mg", discordTag: "goroazteka_" },
    "1353493332436975689": { name: "La Sapito", class: "elf", discordTag: "villadolorense" },
    "1013977109397516328": { name: "DmoonKing", class: "dl", discordTag: "cburgosr" },
    "472880105715269642": { name: "Mahoraga", class: "dl", discordTag: "giancargp92" },
    "706734124337201172": { name: "Takamura25", class: "dl", discordTag: "lokuaz25" },
    "1428899666300239926": { name: "FRESAMG", class: "mg", discordTag: "fresita987" },
    "783100111088517151": { name: "BlueGirl", class: "elf", discordTag: "blue070326" },
    "925222969993723904": { name: "Raptalia", class: "elf", discordTag: "manuelf0750" },
    "1558929388760858644": { name: "AMDRyzen5", class: "dl", discordTag: "x_mandarina_xd" },
    "693971821107871775": { name: "CD", class: "sm", discordTag: "michopatuco79" },
    "1270553622509260850": { name: "lPENELOPEl", class: "dl", discordTag: "jostel2018" },
    "280142109623844864": { name: "GarrenT", class: "dl", discordTag: "garrent8358" },
    "1167689767404716112": { name: "WARL0CK", class: "dl", discordTag: "fedefisherman" },
    "1353509863753252914": { name: "silfi", class: "elf", discordTag: "muguiwara07805" },
    "830705180760211466": { name: "Sunnset", class: "sm", discordTag: "kevvo30" },
    "1329901199457128489": { name: "Kizame", class: "mg", discordTag: "kawamatsu22_12628" },
    "1407618804535660564": { name: "SMNemain", class: "sm", discordTag: "marco.antoniosanchez" }
  },
  messageId: null,
  nextPartyId: 10
};

// ─── State helpers ────────────────────────────────────────────────────────────
function loadState() {
  if (fs.existsSync(DATA_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      if (data && data.parties && data.parties.length > 0 && Object.keys(data.players || {}).length > 0) {
        return data;
      }
    } catch {}
  }
  return JSON.parse(JSON.stringify(DEFAULT_INITIAL_STATE));
}

function saveState(state) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2), 'utf8');
}

let state = loadState();

// ─── Render Web Server & Keep-Alive ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Castle Siege Bot - Online</title>
      </head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1e1f22;color:#fff;display:flex;align-items:center;justify-content:center;height:90vh;margin:0;">
        <div style="text-align:center;padding:2.5rem 3rem;background:#2b2d31;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #3f4147;">
          <h1 style="margin:0 0 0.5rem 0;font-size:1.8rem;">🏰 Castle Siege Discord Bot</h1>
          <p style="color:#57f287;font-weight:bold;font-size:1.1rem;margin:0.5rem 0;">● Estado: 24/7 ONLINE</p>
          <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #3f4147;color:#b5bac1;font-size:0.95rem;">
            Partys activas: <b style="color:#fff;">${state.parties.length}</b> &nbsp;|&nbsp; 
            Jugadores registrados: <b style="color:#fff;">${Object.keys(state.players).length}</b>
          </div>
        </div>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP para Render listo en el puerto ${PORT}`);
});

// Auto-ping si está configurado en Render
const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.PING_URL;
if (keepAliveUrl) {
  console.log(`⏱️ Auto-ping activado para ${keepAliveUrl} cada 10 minutos.`);
  setInterval(() => {
    try {
      const clientHttp = keepAliveUrl.startsWith('https') ? https : http;
      clientHttp.get(keepAliveUrl, () => {
        console.log(`⏱️ Ping keep-alive enviado a ${keepAliveUrl}`);
      }).on('error', err => console.log('Ping keep-alive:', err.message));
    } catch (e) {
      console.error('Error en ping self:', e);
    }
  }, 10 * 60 * 1000);
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateParty(party) {
  const classes = party.members.map(m => state.players[m]?.class ?? 'none');
  const hasInner = classes.some(c => c === 'inner' || c === 'mg');
  const hasElf   = classes.includes('elf');
  const hasDL    = classes.includes('dl');
  const isFull   = party.members.length >= MAX_MEMBERS;
  const isValid  = hasInner && hasElf && hasDL;

  let status = '';
  if (isFull && isValid)       status = '✅🔵';
  else if (isFull && !isValid) status = '🔵⚠️';
  else if (isValid)            status = '✅';
  else                         status = '⚠️';

  const missing = [];
  if (!hasInner) missing.push('Inner (BK/MG)');
  if (!hasElf)   missing.push('Elf');
  if (!hasDL)    missing.push('DL');

  return { isValid, isFull, status, missing };
}

// ─── Embed builder ────────────────────────────────────────────────────────────
function buildEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🏰 CASTLE SIEGE — PARTYS')
    .setColor(0x2b2d31)
    .setTimestamp()
    .setFooter({ text: 'Castle Siege • MuServer' });

  if (state.parties.length === 0) {
    embed.setDescription('> No hay partys creadas aún.\n> Un administrador o asistente puede crear una con **➕ Nueva Party**.');
  } else {
    const fields = state.parties.map((party, i) => {
      const { status, missing } = validateParty(party);
      const pin = party.fixed ? ' 📌' : '';
      const count = `${party.members.length}/${MAX_MEMBERS}`;
      let memberList = '';

      if (party.members.length === 0) {
        memberList = '*— vacía —*';
      } else {
        memberList = party.members.map(uid => {
          const p   = state.players[uid];
          const cls = CLASS_META[p?.class ?? 'none'] || CLASS_META.none;
          return `${cls.emoji} \`[${cls.short}]\` ${p?.name ?? uid}`;
        }).join('\n');
      }

      let footer = '';
      if (missing.length > 0) footer = `\n⚠️ *falta ${missing.join(', ')}*`;

      return {
        name : `${i + 1}. ${party.name}${pin}  ${status}  (${count})`,
        value: memberList + footer,
        inline: false,
      };
    });

    embed.addFields(fields);
  }

  // Unassigned players
  const assigned = new Set(state.parties.flatMap(p => p.members));
  const unassigned = Object.entries(state.players)
    .filter(([uid]) => !assigned.has(uid))
    .map(([, p]) => {
      const cls = CLASS_META[p.class ?? 'none'] || CLASS_META.none;
      return `${cls.emoji} \`[${cls.short}]\` ${p.name}`;
    });

  if (unassigned.length > 0) {
    embed.addFields({
      name : '📋 Sin asignar',
      value: unassigned.join('\n'),
      inline: false,
    });
  }

  return embed;
}

// ─── Public component builders ────────────────────────────────────────────────
function buildPublicRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_register').setLabel('📝 Registrar PJ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_join').setLabel('⚔️ Unirme a Party').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_leave').setLabel('🚪 Salir de Party').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_changeclass').setLabel('🔄 Cambiar Clase').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_newparty').setLabel('➕ Nueva Party').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_staff_panel').setLabel('⚙️ Opciones Staff').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

// ─── Ephemeral Staff Panel row builder ─────────────────────────────────────────
function buildStaffPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_newparty').setLabel('➕ Nueva Party').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_move_player').setLabel('🔀 Mover PJ').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_pin').setLabel('📌 Fijar/Desfijar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_desarmar').setLabel('🔄 Desarmar Partys').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_reset').setLabel('🗑️ Resetear Todo').setStyle(ButtonStyle.Danger),
    )
  ];
}

// ─── Target channel cache ─────────────────────────────────────────────────────
async function getTargetChannel() {
  return client.channels.cache.get(CHANNEL_ID) || await client.channels.fetch(CHANNEL_ID).catch(() => null);
}

// ─── Refresh pinned message & eliminate duplicates ────────────────────────────
async function refreshMessage() {
  const channel = await getTargetChannel();
  if (!channel) {
    console.error('❌ Canal no encontrado para refrescar mensaje.');
    return;
  }
  const embed   = buildEmbed();
  const rows    = buildPublicRows();
  const payload = { embeds: [embed], components: rows };

  try {
    // Buscar mensajes recientes en el canal
    const recentMessages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    let targetMsg = null;

    if (recentMessages) {
      // Filtrar todos los mensajes enviados por este bot
      const botMessages = Array.from(recentMessages.values())
        .filter(m => m.author.id === client.user.id)
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp); // El más nuevo primero

      if (botMessages.length > 0) {
        // Tomamos el mensaje más reciente como el panel activo
        targetMsg = botMessages[0];

        // Borramos los mensajes duplicados anteriores para que no queden 2 paneles
        for (let i = 1; i < botMessages.length; i++) {
          await botMessages[i].delete().catch(() => null);
        }
      }
    }

    if (targetMsg) {
      await targetMsg.edit(payload);
      state.messageId = targetMsg.id;
      saveState(state);
      return;
    }

    // Si no había ningún mensaje previo, enviamos uno nuevo
    const newMsg = await channel.send(payload);
    state.messageId = newMsg.id;
    saveState(state);
  } catch (err) {
    console.error('Error refreshing message:', err);
  }
}

// ─── Admin check ─────────────────────────────────────────────────────────────
function isAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has('Administrator') || member.permissions?.has('ManageGuild')) return true;
  const adminRoleNames = [
    'asistente', 'soporte', 'staff', 'guild master', 'gm', 'admin',
    'administrador', 'organizador', 'lider', 'líder', 'sub-lider', 'sub-líder', 'mod', 'moderador'
  ];
  if (member.roles?.cache?.some(r => adminRoleNames.includes(r.name.toLowerCase()))) return true;
  return false;
}

// ─── Client setup ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const channel = await getTargetChannel();
  if (!channel) {
    console.error('❌ Canal no encontrado. Revisá CHANNEL_ID en .env');
    return;
  }
  await refreshMessage();
  console.log('📋 Mensaje del organizador listo en #' + channel.name);
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  try {
    const uid = interaction.user.id;

    // ── BUTTONS ────────────────────────────────────────────────────────────
    if (interaction.isButton()) {

      // ── Registrar PJ ────────────────────────────────────────────────────
      if (interaction.customId === 'btn_register') {
        const currentPlayer = state.players[uid];
        const modal = new ModalBuilder()
          .setCustomId('modal_register')
          .setTitle('📝 Registrar Personaje');

        const nameInput = new TextInputBuilder()
          .setCustomId('char_name')
          .setLabel('Nombre del personaje')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ej: Mustang, Maxi, Vashi...')
          .setValue(currentPlayer?.name || '')
          .setRequired(true)
          .setMaxLength(30);

        const classInput = new TextInputBuilder()
          .setCustomId('char_class')
          .setLabel('Clase (BK, MG, Elf, DL, SM o vacío)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ej: DL, BK, Elf, SM, MG')
          .setValue(currentPlayer && currentPlayer.class !== 'none' ? CLASS_META[currentPlayer.class]?.short || '' : '')
          .setRequired(false)
          .setMaxLength(20);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(classInput)
        );
        await interaction.showModal(modal);
        return;
      }

      // ── Unirme a Party ──────────────────────────────────────────────────
      if (interaction.customId === 'btn_join') {
        if (!state.players[uid]) {
          await interaction.reply({ content: '❌ Primero registrá tu personaje con **📝 Registrar PJ**.', flags: MessageFlags.Ephemeral });
          return;
        }
        const available = state.parties.filter(p => p.members.length < MAX_MEMBERS && !p.members.includes(uid));
        if (available.length === 0) {
          await interaction.reply({ content: '❌ No hay partys disponibles con lugar.', flags: MessageFlags.Ephemeral });
          return;
        }
        const options = available.map(p => {
          const { status } = validateParty(p);
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name} (${p.members.length}/${MAX_MEMBERS}) ${status}`)
            .setValue(p.id);
        });
        const select = new StringSelectMenuBuilder()
          .setCustomId('select_join_party')
          .setPlaceholder('Elegí una party...')
          .addOptions(options);
        await interaction.reply({
          content: '⚔️ ¿A qué party te querés unir?',
          components: [new ActionRowBuilder().addComponents(select)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // ── Salir de Party ──────────────────────────────────────────────────
      if (interaction.customId === 'btn_leave') {
        const party = state.parties.find(p => p.members.includes(uid));
        if (!party) {
          await interaction.reply({ content: '❌ No estás en ninguna party actualmente.', flags: MessageFlags.Ephemeral });
          return;
        }
        party.members = party.members.filter(m => m !== uid);
        saveState(state);
        await interaction.reply({ content: `✅ Saliste de **${party.name}**.`, flags: MessageFlags.Ephemeral });
        refreshMessage();
        return;
      }

      // ── Cambiar Clase ──────────────────────────────────────────────────
      if (interaction.customId === 'btn_changeclass') {
        if (!state.players[uid]) {
          await interaction.reply({ content: '❌ Primero registrá tu personaje con **📝 Registrar PJ**.', flags: MessageFlags.Ephemeral });
          return;
        }
        const currentClass = state.players[uid].class ?? 'none';
        const options = Object.entries(CLASS_META).map(([val, meta]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${meta.emoji} ${meta.label}`)
            .setValue(val)
            .setDefault(currentClass === val)
        );
        const select = new StringSelectMenuBuilder()
          .setCustomId('select_changeclass')
          .setPlaceholder('Elegí tu clase...')
          .addOptions(options);
        await interaction.reply({
          content: `🔄 Cambiá la clase de **${state.players[uid].name}**:`,
          components: [new ActionRowBuilder().addComponents(select)],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // ── Nueva Party (Solo miembros con rol) ─────────────────────────────
      if (interaction.customId === 'btn_newparty') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({
            content: '❌ Solo los miembros con rol de **Asistente**, **Soporte** o **Administrador** pueden crear partys.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const id   = `party_${state.nextPartyId++}`;
        const name = `Party ${state.parties.length + 1}`;
        state.parties.push({ id, name, members: [], fixed: false });
        saveState(state);
        await interaction.reply({ content: `✅ **${name}** creada exitosamente.`, flags: MessageFlags.Ephemeral });
        refreshMessage();
        return;
      }

      // ── Botón Panel Staff ───────────────────────────────────────────────
      if (interaction.customId === 'btn_staff_panel') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({
            content: '❌ Este panel es exclusivo para miembros con rol de **Asistente**, **Soporte** o **Administrador**.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const panelRows = buildStaffPanelRows();
        await interaction.reply({
          content: '⚙️ **Panel de Administración y Control:**\nElegí qué acción querés realizar en las partys:',
          components: panelRows,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // ── Mover PJ (admin) ────────────────────────────────────────────────
      if (interaction.customId === 'btn_move_player') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({ content: '❌ Solo los administradores, asistentes o soporte pueden mover jugadores.', flags: MessageFlags.Ephemeral });
          return;
        }
        const playerEntries = Object.entries(state.players);
        if (playerEntries.length === 0) {
          await interaction.reply({ content: '❌ No hay jugadores registrados en el sistema.', flags: MessageFlags.Ephemeral });
          return;
        }

        const options = playerEntries.slice(0, 25).map(([pUid, p]) => {
          const currentParty = state.parties.find(party => party.members.includes(pUid));
          const partyText    = currentParty ? currentParty.name : 'Sin asignar';
          const cls          = CLASS_META[p.class ?? 'none'] || CLASS_META.none;
          return new StringSelectMenuOptionBuilder()
            .setLabel(`${p.name} [${cls.short}]`)
            .setDescription(`En: ${partyText} (${p.discordTag || 'Discord'})`)
            .setValue(pUid);
        });

        const select = new StringSelectMenuBuilder()
          .setCustomId('select_admin_pick_player')
          .setPlaceholder('Elegí qué personaje querés mover...')
          .addOptions(options);

        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          await interaction.update({
            content: '🔀 **Gestión de partys:** ¿Qué personaje querés reasignar o mover?',
            components: [new ActionRowBuilder().addComponents(select)],
          });
        } else {
          await interaction.reply({
            content: '🔀 **Gestión de partys:** ¿Qué personaje querés reasignar o mover?',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      // ── Desarmar Partys (admin) ─────────────────────────────────────────
      if (interaction.customId === 'btn_desarmar') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({ content: '❌ Solo los administradores, asistentes o soporte pueden hacer esto.', flags: MessageFlags.Ephemeral });
          return;
        }
        state.parties.forEach(p => { if (!p.fixed) p.members = []; });
        saveState(state);
        const replyPayload = { content: '🔄 Partys desarmadas. Las que están fijadas (📌) se mantuvieron.', components: [] };
        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          await interaction.update(replyPayload);
        } else {
          await interaction.reply({ ...replyPayload, flags: MessageFlags.Ephemeral });
        }
        refreshMessage();
        return;
      }

      // ── Resetear Todo (admin) ───────────────────────────────────────────
      if (interaction.customId === 'btn_reset') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({ content: '❌ Solo los administradores, asistentes o soporte pueden hacer esto.', flags: MessageFlags.Ephemeral });
          return;
        }
        const confirmBtn = new ButtonBuilder().setCustomId('btn_reset_confirm').setLabel('✅ Sí, borrar todo').setStyle(ButtonStyle.Danger);
        const cancelBtn  = new ButtonBuilder().setCustomId('btn_reset_cancel').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary);
        const confirmPayload = {
          content: '⚠️ **¿Estás seguro?** Esto va a vaciar todas las partys y borrar la lista de personajes registrados.',
          components: [new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)],
        };

        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          await interaction.update(confirmPayload);
        } else {
          await interaction.reply({ ...confirmPayload, flags: MessageFlags.Ephemeral });
        }
        return;
      }

      if (interaction.customId === 'btn_reset_confirm') {
        state.parties     = [];
        state.players     = {};
        state.nextPartyId = 1;
        saveState(state);
        await interaction.update({ content: '🗑️ Todo ha sido reseteado.', components: [] });
        refreshMessage();
        return;
      }

      if (interaction.customId === 'btn_reset_cancel') {
        await interaction.update({ content: '❌ Cancelado.', components: [] });
        return;
      }

      // ── Fijar/Desfijar Party (admin) ────────────────────────────────────
      if (interaction.customId === 'btn_pin') {
        if (!isAdmin(interaction.member)) {
          await interaction.reply({ content: '❌ Solo los administradores, asistentes o soporte pueden hacer esto.', flags: MessageFlags.Ephemeral });
          return;
        }
        if (state.parties.length === 0) {
          await interaction.reply({ content: '❌ No hay partys creadas para fijar.', flags: MessageFlags.Ephemeral });
          return;
        }
        const options = state.parties.map(p =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${p.fixed ? '📌' : '📋'} ${p.name}`)
            .setDescription(p.fixed ? 'Actualmente fija — click para desfijar' : 'Click para fijar')
            .setValue(p.id)
        );
        const select = new StringSelectMenuBuilder()
          .setCustomId('select_pin_party')
          .setPlaceholder('Elegí la party a fijar/desfijar...')
          .addOptions(options);

        const pinPayload = {
          content: '📌 ¿Qué party querés fijar o desfijar?',
          components: [new ActionRowBuilder().addComponents(select)],
        };

        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          await interaction.update(pinPayload);
        } else {
          await interaction.reply({ ...pinPayload, flags: MessageFlags.Ephemeral });
        }
        return;
      }
    }

    // ── SELECT MENUS ────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {

      // ── Admin: Elegir a qué party mover un jugador ───────────────────────
      if (interaction.customId === 'select_admin_pick_player') {
        const targetUid    = interaction.values[0];
        const targetPlayer = state.players[targetUid];
        if (!targetPlayer) {
          await interaction.update({ content: '❌ Jugador no encontrado.', components: [] });
          return;
        }

        const currentParty = state.parties.find(p => p.members.includes(targetUid));
        const options = [];

        options.push(
          new StringSelectMenuOptionBuilder()
            .setLabel('📋 Dejar Sin Asignar (Quitar de su party)')
            .setDescription('Saca al jugador de su party actual y lo deja en espera')
            .setValue('unassign')
        );

        for (const p of state.parties) {
          const isCurrent = currentParty?.id === p.id;
          const isFull    = p.members.length >= MAX_MEMBERS;
          options.push(
            new StringSelectMenuOptionBuilder()
              .setLabel(`${p.name} (${p.members.length}/${MAX_MEMBERS})${isCurrent ? ' [Actual]' : ''}`)
              .setDescription(isCurrent ? 'Ya está en esta party' : (isFull ? 'Party completa (5/5)' : 'Mover jugador aquí'))
              .setValue(p.id)
          );
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(`select_admin_target_party_${targetUid}`)
          .setPlaceholder(`Elegí el destino para ${targetPlayer.name}...`)
          .addOptions(options.slice(0, 25));

        await interaction.update({
          content: `🔀 **Mover a ${targetPlayer.name}:** ¿A qué party querés asignarlo?`,
          components: [new ActionRowBuilder().addComponents(select)],
        });
        return;
      }

      // ── Admin: Aplicar movimiento de party ──────────────────────────────
      if (interaction.customId.startsWith('select_admin_target_party_')) {
        const targetUid    = interaction.customId.replace('select_admin_target_party_', '');
        const targetPlayer = state.players[targetUid];
        const destination  = interaction.values[0];

        if (!targetPlayer) {
          await interaction.update({ content: '❌ Jugador no encontrado.', components: [] });
          return;
        }

        state.parties.forEach(p => {
          p.members = p.members.filter(m => m !== targetUid);
        });

        if (destination === 'unassign') {
          saveState(state);
          await interaction.update({
            content: `✅ **${targetPlayer.name}** fue retirado de su party y ahora está en **Sin asignar**.`,
            components: [],
          });
          refreshMessage();
          return;
        }

        const targetParty = state.parties.find(p => p.id === destination);
        if (!targetParty) {
          await interaction.update({ content: '❌ Party de destino no encontrada.', components: [] });
          return;
        }

        if (targetParty.members.length >= MAX_MEMBERS) {
          await interaction.update({ content: `❌ La **${targetParty.name}** ya está llena (5/5).`, components: [] });
          return;
        }

        targetParty.members.push(targetUid);
        saveState(state);
        await interaction.update({
          content: `✅ **${targetPlayer.name}** fue movido a **${targetParty.name}** correctamente.`,
          components: [],
        });
        refreshMessage();
        return;
      }

      // ── Unirse a party (jugador) ────────────────────────────────────────
      if (interaction.customId === 'select_join_party') {
        const partyId = interaction.values[0];
        const party   = state.parties.find(p => p.id === partyId);
        if (!party) {
          await interaction.update({ content: '❌ Party no encontrada.', components: [] });
          return;
        }
        if (party.members.length >= MAX_MEMBERS) {
          await interaction.update({ content: '❌ Esa party ya está llena (5/5).', components: [] });
          return;
        }
        state.parties.forEach(p => { p.members = p.members.filter(m => m !== uid); });
        party.members.push(uid);
        saveState(state);
        const player = state.players[uid];
        await interaction.update({
          content: `✅ **${player?.name || 'Tu personaje'}** se unió a **${party.name}**.`,
          components: [],
        });
        refreshMessage();
        return;
      }

      // ── Cambiar clase ───────────────────────────────────────────────────
      if (interaction.customId === 'select_changeclass') {
        const newClass = interaction.values[0];
        if (!state.players[uid]) {
          await interaction.update({ content: '❌ Registrá tu personaje primero.', components: [] });
          return;
        }
        state.players[uid].class = newClass;
        saveState(state);
        const cls = CLASS_META[newClass];
        await interaction.update({
          content: `✅ Clase de **${state.players[uid].name}** actualizada a ${cls.emoji} **${cls.label}**.`,
          components: [],
        });
        refreshMessage();
        return;
      }

      // ── Fijar/Desfijar party ────────────────────────────────────────────
      if (interaction.customId === 'select_pin_party') {
        const partyId = interaction.values[0];
        const party   = state.parties.find(p => p.id === partyId);
        if (!party) {
          await interaction.update({ content: '❌ Party no encontrada.', components: [] });
          return;
        }
        party.fixed = !party.fixed;
        saveState(state);
        await interaction.update({
          content: `✅ **${party.name}** ahora está ${party.fixed ? 'fijada 📌 (no se desarmará)' : 'desfijada 📋'}.`,
          components: [],
        });
        refreshMessage();
        return;
      }
    }

    // ── MODALS ──────────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {

      // ── Registrar personaje ─────────────────────────────────────────────
      if (interaction.customId === 'modal_register') {
        const nameInput  = interaction.fields.getTextInputValue('char_name').trim();
        const rawClass   = interaction.fields.getTextInputValue('char_class')?.trim() || '';

        if (!nameInput) {
          await interaction.reply({ content: '❌ El nombre no puede estar vacío.', flags: MessageFlags.Ephemeral });
          return;
        }

        const taken = Object.entries(state.players).find(
          ([id, p]) => p.name.toLowerCase() === nameInput.toLowerCase() && id !== uid
        );
        if (taken) {
          await interaction.reply({
            content: `❌ El nombre **${nameInput}** ya está registrado por otro usuario.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const isUpdate = !!state.players[uid];
        const parsedClass = rawClass ? parseClassInput(rawClass) : (state.players[uid]?.class || 'none');

        state.players[uid] = {
          name: nameInput,
          class: parsedClass,
          discordTag: interaction.user.username,
        };
        saveState(state);

        const cls = CLASS_META[parsedClass] || CLASS_META.none;
        const msgText = isUpdate
          ? `🔄 Personaje actualizado: **${nameInput}** (${cls.emoji} ${cls.label})`
          : `✅ ¡Personaje **${nameInput}** registrado exitosamente como ${cls.emoji} **${cls.label}**!`;

        await interaction.reply({
          content: msgText + '\n*Podés cambiar tu clase en cualquier momento con el botón 🔄 Cambiar Clase.*',
          flags: MessageFlags.Ephemeral,
        });

        refreshMessage();
        return;
      }
    }
  } catch (err) {
    console.error('Error procesando interacción:', err);
    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ocurrió un error al procesar la solicitud. Por favor reintentá.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (e) {
      console.error('Error al enviar mensaje de error de interacción:', e);
    }
  }
});

// ─── Launch ───────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
