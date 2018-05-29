'use strict';

const bitcoin = require('bitcoin');
let config = require('config');
let spamchannel = config.get('botspamchannel');
let regex = require('regex');
let aceddConfig = config.get('acedd');
let aced = new bitcoin.Client(aceddConfig);
let fs = require('fs');
let path = require('path');
let jsonfile = require('jsonfile');
let settings = require('../settings');

let vouchersFile = path.join(__dirname, '..', '..', settings.VOUCHERS_FILENAME);

if (!fs.existsSync(vouchersFile)) {
  console.error('NO VOUCHERS FILE !!!');
  process.exit();
}

exports.commands = ['tip', 'multitip', 'roletip', 'tips', 'info'];
exports.tip = {
  usage: '<subcommand>',
  description: 'Tip a given user with an amount of ACED or perform wallet specific operations.',
  process: async function(bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
      words = msg.content
        .trim()
        .split(' ')
        .filter(function(n) {
          return n !== '';
        }),
      subcommand = words.length >= 2 ? words[1] : 'help',
      helpmsgparts = [
        ['[help]', 'Get this message.'],
        ['balance', 'Get your balance.'],
        ['deposit', 'Get address for your deposits.'],
        ['withdraw <address> <amount>', 'Withdraw AMOUNT credits to ADDRESS'],
        ['[private] <user> <amount>', 'Mention a user with @ and then the amount to tip them, or put private before the user to tip them privately.']
      ],
      helpmsg = {
        embed: {
          description: formatDescriptions(helpmsgparts) + '\nKey: [] : Optionally include contained keyword, <> : Replace with appropriate value.',
          color: 1109218,
          author: { name: '!tip' }
        }
      },
      channelwarning = 'Please DM bot.',
      MultiorRole = false;
    switch (subcommand) {
      case 'help':
        privateOrSpamChannel(msg, channelwarning, doHelp, [helpmsg]);
        break;
      case 'balance':
        doBalance(msg, tipper);
        break;
      case 'deposit':
        privateOrSpamChannel(msg, channelwarning, doDeposit, [tipper]);
        break;
      case 'withdraw':
        privateOrSpamChannel(msg, channelwarning, doWithdraw, [tipper, words, helpmsg]);  
        break;
      case 'voucher':
        doVoucher(msg, words, doVoucher, vouchersFile);
        break;
      default:
        doTip(bot, msg, tipper, words, helpmsg, MultiorRole);
    }
  }
};

exports.multitip = {
  usage: '<subcommand>',
  description: 'Tip multiple users simultaneously for the same amount of ACED each.',
  process: async function(bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
      words = msg.content
        .trim()
        .split(' ')
        .filter(function(n) {
          return n !== '';
        }),
      subcommand = words.length >= 2 ? words[1] : 'help',
      helpmsgparts = [
        ['[help]', 'Get this message.'],
        ['<user>+ <amount>', 'Mention one or more users in a row, seperated by spaces, then an amount that each mentioned user will receive.'],
        ['private <user>+ <amount>', 'Put private before the user list to have each user tipped privately, without revealing other users tipped.']
      ],
      helpmsg = {
        embed: {
          description: formatDescriptions(helpmsgparts) + '\nKey: [] : Optionally include contained keyword, <> : Replace with appropriate value, + : Value can be repeated for multiple entries.',
          color: 1109218,
          author: { name: '!multitip' }
        }
      },
      channelwarning = 'Please DM bot',
      MultiorRole = true;
    switch (subcommand) {
      case 'help':
        privateOrSpamChannel(msg, channelwarning, doHelp, [helpmsg]);
        break;
      default:
        doMultiTip(bot, msg, tipper, words, helpmsg, MultiorRole);
        break;
    }
  }
};

exports.roletip = {
  usage: '<subcommand>',
  description: 'Tip multiple users simultaneously for the same amount of ACED each.',
  process: async function(bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
      words = msg.content
        .trim()
        .split(' ')
        .filter(function(n) {
          return n !== '';
        }),
      subcommand = words.length >= 2 ? words[1] : 'help',
      helpmsgparts = [
        ['[help]', 'Get this message.'],
        ['<user>+ <amount>', 'Mention one or more users in a row, seperated by spaces, then an amount that each mentioned user will receive.'],
        ['private <user>+ <amount>', 'Put private before the user list to have each user tipped privately, without revealing other users tipped.']
      ],
      helpmsg = {
        embed: {
          description: formatDescriptions(helpmsgparts) + '\nKey: [] : Optionally include contained keyword, <> : Replace with appropriate value, + : Value can be repeated for multiple entries.',
          color: 1109218,
          author: { name: '!roletip' }
        }
      },
      channelwarning = 'Please DM bot.',
      MultiorRole = true;
    switch (subcommand) {
      case 'help':
        privateOrSpamChannel(msg, channelwarning, doHelp, [helpmsg]);
        break;
      default:
        doRoleTip(bot, msg, tipper, words, helpmsg, MultiorRole);
        break;
    }
  }
};

exports.tips = {
  usage: '',
  description: 'Lists all available tipbot commands with brief descriptions for each one.',
  process: async function(bot, msg, suffix) {
    let helpmsgparts = [
        ['!tip <@user> <amount>', 'Tip a given user with an amount of ACED or perform wallet specific operations.'],
        ['!multitip <@user> <amount>', 'Tip multiple users simultaneously for the same amount of ACED each.'],
        ['!roletip <@role> <amount>', 'Tip every user in a given role the same amount of ACED.'],
        ['!tip withdraw <address> <amount>', 'To withdraw your aced to your wallet.'],
        ['!tip deposit', 'To show your ACED wallet address'],
        ['!tip balance', 'To show your ACED balance.'],
        ['!tips', 'Lists all available tipbot commands with brief descriptions for each one.']
      
      ],
      helpmsg = {
        embed: {
          description: `These are all the commands that TipBot currently supports. Use \`!<command> help\` for usage instructions.
${formatDescriptions(helpmsgparts)}`,
          color: 1109218,
          author: { name: 'Tipbot Commands' }
        }
      };
    msg.reply(helpmsg);
  }
};

exports.info = {
  usage: '',
  description: 'Lists all available tipbot commands with brief descriptions for each one.',
  process: async function(bot, msg, suffix) {
    let helpmsgparts = [
        [':no_entry_sign:', '- Do not deposit a significant amount of #ACED through this #BOT'],
        [':no_entry_sign:', '- Make sure that you enter a valid #ACED address when you perform a withdraw'],
        [':no_entry_sign:', '- We are not responsible of your funds if something bad happen to this #BOT']
      ],
      helpmsg = {
        embed: {
          description: `**Make sure you Enter the correct ACED wallet address when you perform a withdraw, or you will lose your ACED!**. 
${formatDescriptions(helpmsgparts)}`,
          color: 1109218,
          author: { name: 'NOTES' }
        }
      };
    msg.reply(helpmsg);
  }
};

function privateOrSpamChannel(message, wrongchannelmsg, fn, args) {
  if (!inPrivateOrSpamChannel(message)) {
    message.reply(wrongchannelmsg);
    return;
  }
  fn.apply(null, [message, ...args]);
}

function doHelp(message, helpmsg) {
  message.author.send(helpmsg);
}

function doBalance(message, tipper) {
  aced.getBalance(tipper, 1, function (err, balance) {
    if (err) {
      message.reply('Error getting your balance.').then(message => message.delete(5000));
    } else {
      message.reply('**Balance**: \`' + balance + ' ACED\`');
    }
  });
}

function doDeposit(message, tipper) {
  getAddress(tipper, function(err, address) {
    if (err) {
      message.reply('Error getting your deposit address.').then(message => message.delete(5000));
    } else {
      embed: {
          message.reply(`**Wallet**: \`${address}\``);
          
        }
    }
  });
}

function doWithdraw(message, tipper, words, helpmsg) {
  if (words.length < 4) {
    doHelp(message, helpmsg);
    return;
  }

  var address = words[2],
    amount = getValidatedAmount(words[3]);

  if (amount === null) {
    message
      .reply("I don't know how to withdraw that many ACED coins...")
      .then(message => message.delete(10000));
    return;
  }

  aced.sendFrom(tipper, address, Number(amount), function(err, txId) {
    if (err) {
      message.reply(err.message).then(message => message.delete(10000));
    } else {
      message.reply('**Withdrew** \`' + amount + '\` **ACED to** \`' +address + '\` \n' + txLink(txId) + '\n');
    }
  });
}

function doVoucher (message, acedNode, voucherCode) {
  var account = message.author.tag.replace('#', '')

  if (message.channel.type === 'dm') {
    var data = jsonfile.readFileSync(vouchersFile)

    var validVoucher = data.vouchers.find(function (element) {
      return element === voucherCode
    })

    if (validVoucher) {
      acedNode.getBalance('', function (err, balance) {
        if (err) {
          console.log(err)
          message.channel.send('Oops ! Something went wrong. Contact Lola.')
          return
        }

        // We don't have enough funds...
        if (balance - 30 <= 0) {
          message.reply('Oops ! Something went wrong. Contact Lola.')
          return
        }

        acedNode.move('', account, 30, function (err, result) {
          if (err) {
            console.log(err)
            message.channel.send('Oops ! Something went wrong. Contact Lola.')
            return
          }

          var index = data.vouchers.indexOf(validVoucher)
          data.vouchers.splice(index, 1)

          jsonfile.writeFileSync(vouchersFile, data)

          message.reply('Successfully Redeemed!')
        })
      })
      return
    }

    message.reply('Invalid Voucher Code!')
    return
  }
  message.reply('Careful, Yoou need to give your voucher code to the bot in a private message !')
}


function doTip(bot, message, tipper, words, helpmsg, MultiorRole) {
  if (words.length < 3 || !words) {
    return doHelp(message, helpmsg);
  }

  let prv = false;
  let amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
    prv = true;
    amountOffset = 3;
  }

  let amount = getValidatedAmount(words[amountOffset]);

  if (amount === null) {
    return message.reply("I don't know how to tip that many credits...").then(message => message.delete(5000));
  }

  if (message.mentions.users.first() && message.mentions.users.first().id) {
    return sendACED(bot, message, tipper, message.mentions.users.first().id.replace('!', ''), amount, prv, MultiorRole);
  }
  message.reply('Sorry, I could not find a user in your tip...');
}

function doMultiTip(bot, message, tipper, words, helpmsg, MultiorRole) {
  if (!words) {
    doHelp(message, helpmsg);
    return;
  }
  if (words.length < 4) {
    doTip(bot, message, tipper, words, helpmsg, MultiorRole);
    return;
  }
  let prv = false;
  if (words.length >= 5 && words[1] === 'private') {
    prv = true;
  }
  let [userIDs, amount] = findUserIDsAndAmount(message, words, prv);
  if (amount == null) {
    message.reply("I don't know how to tip that many credits...").then(message => message.delete(5000));
    return;
  }
  if (!userIDs) {
    message.reply('Sorry, I could not find a user in your tip...').then(message => message.delete(5000));
    return;
  }
  for (let i = 0; i < userIDs.length; i++) {
    sendACED(bot, message, tipper, userIDs[i].toString(), amount, prv, MultiorRole);
  }
}

function doRoleTip(bot, message, tipper, words, helpmsg, MultiorRole) {
  if (!words || words.length < 3) {
    doHelp(message, helpmsg);
    return;
  }

  let prv = false;
  let amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
    prv = true;
    amountOffset = 3;
  }

  let amount = getValidatedAmount(words[amountOffset]);
  if (amount == null) {
    message.reply("I don't know how to tip that many ACED coins...").then(message => message.delete(10000));
    return;
  }
  if (message.mentions.roles.first().id) {
    if (message.mentions.roles.first().members.first().id) {
      let userIDs = message.mentions.roles.first().members.map(member => member.user.id.replace('!', ''));
      for (var i = 0; i < userIDs.length; i++) {
        sendACED(bot, message, tipper, userIDs[i], amount, prv, MultiorRole);
      }
    } else {
      message.reply('Sorry, I could not find any users to tip in that role...').then(message => message.delete(10000));
      return;
    }
  } else {
    message.reply('Sorry, I could not find any roles in your tip...').then(message => message.delete(10000));
    return;
  }
}

function findUserIDsAndAmount(message, words, prv) {
  let idList = [];
  let amount = null;
  let count = 0;
  let startOffset = 1;
  if (prv) startOffset = 2;
  let regex = new RegExp(/<@!?[0-9]+>/);
  for (let i = startOffset; i < words.length; i++) {
    if (regex.test(words[i])) {
      count++;
      idList.push(words[i].match(/[0-9]+/));
    } else {
      amount = getValidatedAmount(words[Number(count) + 1]);
      break;
    }
  }
  return [idList, amount];
}

function sendACED(bot, message, tipper, recipient, amount, privacyFlag, MultiorRole) {
  getAddress(recipient.toString(), function(err, address) {
    if (err) {
      message.reply(err.message).then(message => message.delete(5000));
    } else {
      aced.sendFrom(tipper, address, Number(amount), 1, null, null, function(err, txId) {
        if (err) {
          message.reply(err.message).then(message => message.delete(5000));
        } else {
          let tx = txLink(txId);
          let msgtail = `
DM me with \`${message.content.split(' ', 1)[0]}\` for command specific instructions or with \`!tips\` for all available commands`;
          if (privacyFlag) {
            let usr = message.guild.members.find('id', recipient).user;
            let authmsg = `You have just privately tipped @${usr.tag} ${amount} ACED.
${tx}${msgtail}`;
            message.author.send(authmsg);
            if (message.author.id !== message.mentions.users.first().id) {
              let recipientmsg = `You have just been privately tipped ${amount} ACED by @${message.author.tag}.
${tx}${msgtail}`;
              usr.send(recipientmsg);
            }
          } else {
            let generalmsg = `**Tipped** <@${recipient}> \`${amount}\` **ACED** :zap:`;
            message.reply(generalmsg);
          }
        }
      });
    }
  });
}

function getAddress(userId, cb) {
  aced.getAddressesByAccount(userId, function(err, addresses) {
    if (err) {
      cb(err);
    } else if (addresses.length > 0) {
      cb(null, addresses[0]);
    } else {
      aced.getNewAddress(userId, function(err, address) {
        if (err) {
          cb(err);
        } else {
          cb(null, address);
        }
      });
    }
  });
}

function inPrivateOrSpamChannel(msg) {
  return msg.channel.type === 'dm' || msg.channel.id === spamchannel;
}

function getValidatedAmount(amount) {
  amount = amount.trim();
  if (amount.toLowerCase().endsWith('aced')) {
    amount = amount.substring(0, amount.length - 3);
  }
  return amount.match(/^[0-9]+(\.[0-9]+)?$/) ? amount : null;
}

function txLink(txId) {
  return '<http://explorer.acedcoin.com/tx/' + txId + '>';
}

function formatDescriptions(msgparts) {
  return msgparts
    .map(
      elem => `\t**${elem[0]}**
\t\t${elem[1]}
`
    )
    .join('');
}
