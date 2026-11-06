require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, Events, ComponentType
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

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

// ─── State helpers ────────────────────────────────────────────────────────────
function loadState() {
  if (!fs.existsSync(DATA_PATH)) return { parties: [], players: {}, messageId: null, nextPartyId: 1 };
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
  catch { return { parties: [], players: {}, messageId: null, nextPartyId: 1 }; }
}

function saveState(state) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2), 'utf8');
}

let state = loadState();

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
    embed.setDescription('> No hay partys creadas aún.\n> Un admin puede crear una con **➕ Nueva Party**.');
    return embed;
  }

  const fields = state.parties.map((party, i) => {
    const { status, missing, isFull } = validateParty(party);
    const pin = party.fixed ? ' 📌' : '';
    const count = `${party.members.length}/${MAX_MEMBERS}`;
    let memberList = '';

    if (party.members.length === 0) {
      memberList = '*— vacía —*';
    } else {
      memberList = party.members.map(uid => {
        const p   = state.players[uid];
        const cls = CLASS_META[p?.class ?? 'none'];
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

  // Unassigned players
  const assigned = new Set(state.parties.flatMap(p => p.members));
  const unassigned = Object.entries(state.players)
    .filter(([uid]) => !assigned.has(uid))
    .map(([, p]) => {
      const cls = CLASS_META[p.class ?? 'none'];
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

// ─── Component builders ───────────────────────────────────────────────────────
function buildMemberButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_register').setLabel('📝 Registrar PJ').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_join').setLabel('⚔️ Unirme a Party').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_leave').setLabel('🚪 Salir de Party').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_changeclass').setLabel('🔄 Cambiar Clase').setStyle(ButtonStyle.Secondary),
  );
}

function buildAdminButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_newparty').setLabel('➕ Nueva Party').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_desarmar').setLabel('🔄 Desarmar Partys').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_reset').setLabel('🗑️ Resetear Todo').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_pin').setLabel('📌 Fijar/Desfijar Party').setStyle(ButtonStyle.Secondary),
  );
}

// ─── Refresh pinned message ───────────────────────────────────────────────────
async function refreshMessage(channel) {
  const embed    = buildEmbed();
  const memberRow = buildMemberButtons();
  const adminRow  = buildAdminButtons();
  const payload  = { embeds: [embed], components: [memberRow, adminRow] };

  try {
    if (state.messageId) {
      const msg = await channel.messages.fetch(state.messageId).catch(() => null);
      if (msg) { await msg.edit(payload); return; }
    }
    // No message yet — post a new one
    const msg = await channel.send(payload);
    state.messageId = msg.id;
    saveState(state);
  } catch (err) {
    console.error('Error refreshing message:', err);
  }
}

// ─── Admin check ─────────────────────────────────────────────────────────────
function isAdmin(member) {
  return member.permissions.has('ManageGuild') || member.permissions.has('Administrator');
}

// ─── Client setup ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) { console.error('❌ Canal no encontrado. Revisá CHANNEL_ID en .env'); return; }
  await refreshMessage(channel);
  console.log('📋 Mensaje del organizador listo en #' + channel.name);
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

  // ── BUTTONS ──────────────────────────────────────────────────────────────
  if (interaction.isButton()) {
    const uid = interaction.user.id;

    // ── Registrar PJ ──────────────────────────────────────────────────────
    if (interaction.customId === 'btn_register') {
      const modal = new ModalBuilder()
        .setCustomId('modal_register')
        .setTitle('📝 Registrar Personaje');

      const nameInput = new TextInputBuilder()
        .setCustomId('char_name')
        .setLabel('Nombre del personaje')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: Sagat, Vashi, Kizame...')
        .setRequired(true)
        .setMaxLength(30);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
      return;
    }

    // ── Unirme a Party ────────────────────────────────────────────────────
    if (interaction.customId === 'btn_join') {
      if (!state.players[uid]) {
        await interaction.reply({ content: '❌ Primero registrá tu personaje con **📝 Registrar PJ**.', ephemeral: true });
        return;
      }
      const available = state.parties.filter(p => p.members.length < MAX_MEMBERS && !p.members.includes(uid));
      if (available.length === 0) {
        await interaction.reply({ content: '❌ No hay partys disponibles con lugar.', ephemeral: true });
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
        ephemeral: true,
      });
      return;
    }

    // ── Salir de Party ────────────────────────────────────────────────────
    if (interaction.customId === 'btn_leave') {
      const party = state.parties.find(p => p.members.includes(uid));
      if (!party) {
        await interaction.reply({ content: '❌ No estás en ninguna party.', ephemeral: true });
        return;
      }
      party.members = party.members.filter(m => m !== uid);
      saveState(state);
      await refreshMessage(channel);
      await interaction.reply({ content: `✅ Saliste de **${party.name}**.`, ephemeral: true });
      return;
    }

    // ── Cambiar Clase ────────────────────────────────────────────────────
    if (interaction.customId === 'btn_changeclass') {
      if (!state.players[uid]) {
        await interaction.reply({ content: '❌ Primero registrá tu personaje.', ephemeral: true });
        return;
      }
      const options = Object.entries(CLASS_META).map(([val, meta]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${meta.emoji} ${meta.label}`)
          .setValue(val)
          .setDefault(state.players[uid].class === val)
      );
      const select = new StringSelectMenuBuilder()
        .setCustomId('select_changeclass')
        .setPlaceholder('Elegí tu nueva clase...')
        .addOptions(options);
      await interaction.reply({
        content: `🔄 Cambiá la clase de **${state.players[uid].name}**:`,
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true,
      });
      return;
    }

    // ── Nueva Party (admin) ───────────────────────────────────────────────
    if (interaction.customId === 'btn_newparty') {
      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ Solo los admins pueden crear partys.', ephemeral: true });
        return;
      }
      const id   = `party_${state.nextPartyId++}`;
      const name = `Party ${state.parties.length + 1}`;
      state.parties.push({ id, name, members: [], fixed: false });
      saveState(state);
      await refreshMessage(channel);
      await interaction.reply({ content: `✅ **${name}** creada.`, ephemeral: true });
      return;
    }

    // ── Desarmar Partys (admin) ───────────────────────────────────────────
    if (interaction.customId === 'btn_desarmar') {
      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ Solo los admins pueden hacer esto.', ephemeral: true });
        return;
      }
      state.parties.forEach(p => { if (!p.fixed) p.members = []; });
      saveState(state);
      await refreshMessage(channel);
      await interaction.reply({ content: '🔄 Partys desarmadas. Las fijas (📌) se mantuvieron.', ephemeral: true });
      return;
    }

    // ── Resetear Todo (admin) ─────────────────────────────────────────────
    if (interaction.customId === 'btn_reset') {
      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ Solo los admins pueden hacer esto.', ephemeral: true });
        return;
      }
      const confirmBtn = new ButtonBuilder().setCustomId('btn_reset_confirm').setLabel('✅ Sí, borrar todo').setStyle(ButtonStyle.Danger);
      const cancelBtn  = new ButtonBuilder().setCustomId('btn_reset_cancel').setLabel('❌ Cancelar').setStyle(ButtonStyle.Secondary);
      await interaction.reply({
        content: '⚠️ **¿Estás seguro?** Esto va a borrar **todos** los jugadores y partys.',
        components: [new ActionRowBuilder().addComponents(confirmBtn, cancelBtn)],
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId === 'btn_reset_confirm') {
      state.parties   = [];
      state.players   = {};
      state.nextPartyId = 1;
      saveState(state);
      await refreshMessage(channel);
      await interaction.update({ content: '🗑️ Todo reseteado.', components: [] });
      return;
    }

    if (interaction.customId === 'btn_reset_cancel') {
      await interaction.update({ content: '❌ Cancelado.', components: [] });
      return;
    }

    // ── Fijar/Desfijar Party (admin) ──────────────────────────────────────
    if (interaction.customId === 'btn_pin') {
      if (!isAdmin(interaction.member)) {
        await interaction.reply({ content: '❌ Solo los admins pueden hacer esto.', ephemeral: true });
        return;
      }
      if (state.parties.length === 0) {
        await interaction.reply({ content: '❌ No hay partys creadas.', ephemeral: true });
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
      await interaction.reply({
        content: '📌 ¿Qué party querés fijar o desfijar?',
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true,
      });
      return;
    }
  }

  // ── SELECT MENUS ──────────────────────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const uid = interaction.user.id;

    // ── Unirse a party ────────────────────────────────────────────────────
    if (interaction.customId === 'select_join_party') {
      const partyId = interaction.values[0];
      const party   = state.parties.find(p => p.id === partyId);
      if (!party) {
        await interaction.update({ content: '❌ Party no encontrada.', components: [] });
        return;
      }
      if (party.members.length >= MAX_MEMBERS) {
        await interaction.update({ content: '❌ Esa party está llena.', components: [] });
        return;
      }
      // Sacar de la party actual si ya está en alguna
      state.parties.forEach(p => { p.members = p.members.filter(m => m !== uid); });
      party.members.push(uid);
      saveState(state);
      await refreshMessage(channel);
      const player = state.players[uid];
      await interaction.update({
        content: `✅ **${player.name}** se unió a **${party.name}**.`,
        components: [],
      });
      return;
    }

    // ── Cambiar clase ─────────────────────────────────────────────────────
    if (interaction.customId === 'select_changeclass') {
      const newClass = interaction.values[0];
      state.players[uid].class = newClass;
      saveState(state);
      await refreshMessage(channel);
      const cls = CLASS_META[newClass];
      await interaction.update({
        content: `✅ Clase cambiada a **${cls.emoji} ${cls.label}**.`,
        components: [],
      });
      return;
    }

    // ── Fijar/Desfijar party ──────────────────────────────────────────────
    if (interaction.customId === 'select_pin_party') {
      const partyId = interaction.values[0];
      const party   = state.parties.find(p => p.id === partyId);
      if (!party) {
        await interaction.update({ content: '❌ Party no encontrada.', components: [] });
        return;
      }
      party.fixed = !party.fixed;
      saveState(state);
      await refreshMessage(channel);
      await interaction.update({
        content: `✅ **${party.name}** ${party.fixed ? 'fijada 📌' : 'desfijada 📋'}.`,
        components: [],
      });
      return;
    }
  }

  // ── MODALS ────────────────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    const uid = interaction.user.id;

    // ── Registrar personaje ───────────────────────────────────────────────
    if (interaction.customId === 'modal_register') {
      const name = interaction.fields.getTextInputValue('char_name').trim();
      if (!name) {
        await interaction.reply({ content: '❌ El nombre no puede estar vacío.', ephemeral: true });
        return;
      }

      // Verificar que el nombre no lo use otro usuario
      const taken = Object.entries(state.players).find(([id, p]) => p.name.toLowerCase() === name.toLowerCase() && id !== uid);
      if (taken) {
        await interaction.reply({ content: `❌ El nombre **${name}** ya está registrado por otro jugador.`, ephemeral: true });
        return;
      }

      // Si ya tenía PJ registrado, mostrar menú de clase directamente
      const isUpdate = !!state.players[uid];
      const prevClass = state.players[uid]?.class ?? 'none';
      state.players[uid] = { name, class: prevClass, discordTag: interaction.user.username };
      saveState(state);

      // Pedir clase
      const options = Object.entries(CLASS_META).map(([val, meta]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${meta.emoji} ${meta.label}`)
          .setValue(val)
          .setDefault(prevClass === val)
      );
      const select = new StringSelectMenuBuilder()
        .setCustomId('select_register_class')
        .setPlaceholder('Elegí tu clase...')
        .addOptions(options);

      await interaction.reply({
        content: isUpdate
          ? `🔄 Nombre actualizado a **${name}**. ¿Qué clase jugás?`
          : `✅ **${name}** registrado. ¿Qué clase jugás?`,
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true,
      });
      return;
    }
  }

  // ── Select de clase al registrar ──────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_register_class') {
    const uid      = interaction.user.id;
    const newClass = interaction.values[0];
    if (!state.players[uid]) {
      await interaction.update({ content: '❌ Error: registrá tu nombre primero.', components: [] });
      return;
    }
    state.players[uid].class = newClass;
    saveState(state);
    await refreshMessage(channel);
    const cls = CLASS_META[newClass];
    await interaction.update({
      content: `✅ Personaje **${state.players[uid].name}** registrado como ${cls.emoji} **${cls.label}**.`,
      components: [],
    });
  }
});

// ─── Launch ───────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
