const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config.json');

async function sendLog(interaction, content) {
    if (config.ticketLog?.enabled) {
        if (!config.ticketLog.channelId) {
            console.log("⚠️ Log kanalı ID'si ayarlanmamış!");
            return;
        }
        const logChannel = interaction.guild.channels.cache.get(config.ticketLog.channelId);
        if (!logChannel) return;
        await logChannel.send(content);
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Komut çalıştırılırken bir hata oluştu!',
                    ephemeral: true
                });
            }
        }

        if (interaction.isButton()) {
            try {
                if (interaction.customId === 'create_ticket') {
                    const modal = new ModalBuilder()
                        .setCustomId('ticket_modal')
                        .setTitle('Ticket Oluştur');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('ticket_reason')
                        .setLabel('Ticket açma sebebiniz nedir?')
                        .setPlaceholder('Lütfen detaylı bir açıklama yazın...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMinLength(5)
                        .setMaxLength(1000)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    await interaction.showModal(modal);
                }

                if (interaction.customId === 'ticket_close') {
                    const hasPermission = interaction.member.roles.cache.some(role =>
                        config.staffRoles.includes(role.id)) || interaction.member.permissions.has('Administrator');
                    if (!hasPermission) {
                        return interaction.reply({
                            content: '❌ Bu işlemi gerçekleştirmek için yetkiniz yok!',
                            ephemeral: true
                        });
                    }

                    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: false
                    });

                    const ticketOwner = interaction.channel.name.split('-')[1];
                    const owner = interaction.guild.members.cache.find(member => 
                        member.user.username.toLowerCase() === ticketOwner.toLowerCase());
                    
                    if (owner) {
                        await interaction.channel.permissionOverwrites.edit(owner.id, {
                            SendMessages: false
                        });
                    }

                    const closeEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('🔒 Ticket Kapatıldı')
                        .setDescription(`Bu ticket ${interaction.user} tarafından kapatıldı.`)
                        .setTimestamp();

                    const closeButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('ticket_delete')
                                .setLabel('Ticketı Sil')
                                .setStyle('Danger')
                                .setEmoji('🗑️'),
                            new ButtonBuilder()
                                .setCustomId('ticket_reopen')
                                .setLabel('Ticketı Yeniden Aç')
                                .setStyle('Success')
                                .setEmoji('🔓')
                        );

                    await interaction.reply({ embeds: [closeEmbed], components: [closeButtons] });

                    await sendLog(interaction, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Ticket Kapatıldı')
                                .setDescription(`${interaction.channel.name} | Ticket ${interaction.user} tarafından kapatıldı.`)
                                .setColor('Yellow')
                                .setTimestamp()
                        ]
                    });
                }

                if (interaction.customId === 'ticket_delete') {
                    const hasPermission = interaction.member.roles.cache.some(role =>
                        config.staffRoles.includes(role.id)) || interaction.member.permissions.has('Administrator');
                    if (!hasPermission) {
                        return interaction.reply({
                            content: '❌ Bu işlemi gerçekleştirmek için yetkiniz yok!',
                            ephemeral: true
                        });
                    }

                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    let transcript = `Ticket Transcript - ${interaction.channel.name}\n\n`;
                    
                    messages.reverse().forEach(msg => {
                        transcript += `${msg.author.tag} (${msg.createdAt.toLocaleString()}): ${msg.content}\n`;
                        if (msg.embeds.length > 0) {
                            transcript += `[Embed Message]\n`;
                        }
                        if (msg.attachments.size > 0) {
                            transcript += `[Attachments: ${msg.attachments.map(a => a.url).join(', ')}]\n`;
                        }
                        transcript += '\n';
                    });

                    const transcriptEmbed = new EmbedBuilder()
                        .setTitle('📝 Ticket Silindi - Transcript')
                        .setDescription(`${interaction.channel.name} | Silen Yetkili: ${interaction.user.tag}`)
                        .setColor('Red')
                        .setTimestamp();

                    if (config.ticketLog?.enabled && config.ticketLog.channelId) {
                        const logChannel = interaction.guild.channels.cache.get(config.ticketLog.channelId);
                        if (logChannel) {
                            await logChannel.send({
                                embeds: [transcriptEmbed],
                                files: [{
                                    attachment: Buffer.from(transcript, 'utf-8'),
                                    name: `transcript-${interaction.channel.name}.txt`
                                }]
                            });
                        }
                    }

                    await interaction.reply({ content: 'Ticket 5 saniye içinde silinecek...', ephemeral: true });
                    setTimeout(() => interaction.channel.delete(), 5000);
                }

                if (interaction.customId === 'ticket_reopen') {
                    const hasPermission = interaction.member.roles.cache.some(role =>
                        config.staffRoles.includes(role.id)) || interaction.member.permissions.has('Administrator');
                    if (!hasPermission) {
                        return interaction.reply({
                            content: '❌ Bu işlemi gerçekleştirmek için yetkiniz yok!',
                            ephemeral: true
                        });
                    }

                    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: null
                    });
                    
                    const ticketOwner = interaction.channel.name.split('-')[1];
                    const owner = interaction.guild.members.cache.find(member => 
                        member.user.username.toLowerCase() === ticketOwner.toLowerCase());
                    
                    if (owner) {
                        await interaction.channel.permissionOverwrites.edit(owner.id, {
                            SendMessages: true
                        });
                    }

                    const reopenEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('🔓 Ticket Yeniden Açıldı')
                        .setDescription(`Bu ticket ${interaction.user} tarafından yeniden açıldı.`)
                        .setTimestamp();

                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('ticket_close')
                                .setLabel('Ticketı Kapat')
                                .setStyle('Danger')
                                .setEmoji('🔒'),
                            new ButtonBuilder()
                                .setCustomId('ticket_claim')
                                .setLabel('Ticketı Üstlen')
                                .setStyle('Primary')
                                .setEmoji('✋')
                        );

                    await interaction.reply({ embeds: [reopenEmbed], components: [buttons] });

                    await sendLog(interaction, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Ticket Yeniden Açıldı')
                                .setDescription(`${interaction.channel.name} | ${interaction.user} tarafından yeniden açıldı.`)
                                .setColor('Green')
                                .setTimestamp()
                        ]
                    });
                }

                if (interaction.customId === 'ticket_claim') {
                    const hasPermission = interaction.member.roles.cache.some(role =>
                        config.staffRoles.includes(role.id)) || interaction.member.permissions.has('Administrator');
                    if (!hasPermission) {
                        return interaction.reply({
                            content: '❌ Bu işlemi gerçekleştirmek için yetkiniz yok!',
                            ephemeral: true
                        });
                    }

                    const newChannelName = interaction.channel.name.replace('ticket-', 'claimed-');
                    await interaction.channel.setName(newChannelName);

                    const claimEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTitle('✅ Ticket Üstlenildi')
                        .setDescription(`Bu ticket ${interaction.user} tarafından üstlenildi.`)
                        .setTimestamp();

                    const oldMessage = (await interaction.channel.messages.fetch()).first();
                    const oldEmbed = oldMessage.embeds[0];
                    const updatedEmbed = new EmbedBuilder(oldEmbed.data)
                        .addFields({ name: 'Üstlenen Yetkili', value: `${interaction.user}`, inline: true });

                    const newButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('ticket_close')
                                .setLabel('Ticketı Kapat')
                                .setStyle('Danger')
                                .setEmoji('🔒')
                        );

                    await oldMessage.edit({ embeds: [updatedEmbed], components: [newButtons] });
                    await interaction.reply({ embeds: [claimEmbed] });

                    await sendLog(interaction, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Ticket Üstlenildi')
                                .setDescription(`${interaction.channel.name} | Ticket ${interaction.user} tarafından üstlenildi.`)
                                .setColor('Green')
                                .setTimestamp()
                        ]
                    });
                }

            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Buton işlenirken bir hata oluştu!',
                    ephemeral: true
                });
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'ticket_modal') {
                try {
                    const reason = interaction.fields.getTextInputValue('ticket_reason');

                    const ticketChannel = await interaction.guild.channels.create({
                        name: `ticket-${interaction.user.username}`,
                        type: 0,
                        parent: config.ticketParent,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: ['ViewChannel'],
                            },
                            {
                                id: interaction.user.id,
                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                            },
                            ...config.staffRoles.map(roleId => ({
                                id: roleId,
                                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                            })),
                        ],
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle('📝 Yeni Ticket Açıldı!')
                        .setDescription(`**Açan:** ${interaction.user}\n**Sebep:** ${reason}`)
                        .addFields(
                            { name: '📌 Not', value: 'Ekibimiz en kısa sürede size yardımcı olacaktır.' }
                        )
                        .setColor(config.embedColor)
                        .setTimestamp();

                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('ticket_close')
                                .setLabel('Ticketı Kapat')
                                .setStyle('Danger')
                                .setEmoji('🔒'),
                            new ButtonBuilder()
                                .setCustomId('ticket_claim')
                                .setLabel('Ticketı Üstlen')
                                .setStyle('Primary')
                                .setEmoji('✋')
                        );

                    await ticketChannel.send({
                        content: `${interaction.user} | ${config.staffRoles.map(role => `<@&${role}>`).join(', ')}`,
                        embeds: [ticketEmbed],
                        components: [buttons]
                    });

                    await interaction.reply({
                        content: `✅ Ticket kanalınız oluşturuldu: ${ticketChannel}`,
                        ephemeral: true
                    });

                    await sendLog(interaction, {
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Yeni Ticket Oluşturuldu')
                                .setDescription(`${ticketChannel.name} | ${interaction.user} tarafından yeni bir ticket oluşturuldu.\n\n**Sebep:** ${reason}`)
                                .setColor(config.embedColor)
                                .setTimestamp()
                        ]
                    });

                } catch (error) {
                    console.error(error);
                    await interaction.reply({
                        content: 'Ticket oluşturulurken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            }
        }
    },
};