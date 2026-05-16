// Curated list of disposable/temporary email domains (~600 entries)
// Sources: open-source blocklists, manual curation, commonly reported domains
const DISPOSABLE_DOMAINS = new Set([
  // 0-9
  '0-mail.com', '0815.ru', '0clickemail.com', '0wnd.net', '0wnd.org',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.de',
  '10minutemail.info', '10minutemail.co.uk', '10minutemail.us', '10minutemail.be',
  '10minutemail.cf', '10minutemail.ga', '10minutemail.ml', '10minutemail.tk',
  '10minemail.com', '10mail.org',
  '20minutemail.com', '20minutemail.it',
  '33mail.com', '3d-painting.com', '3l6.com',

  // A
  'abcmail.email', 'agedmail.com', 'agmail.co', 'aimail.net',
  'airmail.cc', 'aliasify.com', 'amilegit.com', 'anonbox.net',
  'anonymail.dk', 'anonymousemail.me', 'antichef.com', 'antichef.net',
  'armyspy.com', 'azmeil.tk', 'anonaddy.com', 'anonymousspeech.com',
  'antispam.de', 'antispammail.de', 'anonymized.org',

  // B
  'baxomale.ht.cx', 'beefmilk.com', 'bigstring.com', 'binkmail.com',
  'bio-muesli.net', 'blastmail.org', 'blogmyway.org', 'bobmail.info',
  'bodhi.lawlita.com', 'bofthew.com', 'boxformail.in', 'brefmail.com',
  'brennendesreich.de', 'broadbandninja.com', 'bspamfree.org', 'bugmenot.com',
  'bumpymail.com', 'bund.us', 'burnthespam.info', 'burstmail.info',
  'businessbackend.com', 'buymoreplays.com', 'byom.de', 'burnermail.io',
  'bumpn.org', 'blocked.com', 'breakthru.com',

  // C
  'c2.hu', 'car2go.nl', 'card.zp.ua', 'casualdx.com', 'cek.pm',
  'centermail.com', 'centermail.net', 'chogmail.com', 'choicemail1.com',
  'clixser.com', 'cmail.club', 'cmail.com', 'cmail.net', 'cmail.org',
  'coieo.com', 'coldemail.info', 'cool.fr.nf', 'courrieltemporaire.com',
  'crapmail.org', 'csh.ro', 'curryworld.de', 'cust.in',
  'classiemail.com', 'clrmail.com', 'cleanemails.org', 'clickmail.info',
  'comsafe-mail.net', 'confidential.tips',

  // D
  'dacoolest.com', 'dayrep.com', 'dbunker.com', 'dcemail.com',
  'deadaddress.com', 'deadletter.ga', 'deagot.com', 'dealja.com',
  'digitalsanctuary.com', 'dingbone.com', 'discardmail.com', 'discardmail.de',
  'disposableaddress.com', 'disposableemailaddresses.com', 'disposableinbox.com',
  'dispose.it', 'dispostable.com', 'dm.w3internet.co.uk', 'dodgeit.com',
  'dodgmail.de', 'donemail.ru', 'dontreg.com', 'dontsendmespam.de',
  'drdrb.com', 'drdrb.net', 'dropmail.me', 'dumpandfuck.com',
  'dumpmail.de', 'dumpyemail.com', 'discard.email', 'duck.com',
  'damnthespam.com', 'dmarc.be',

  // E
  'e-mail.com', 'e4ward.com', 'easytrashmail.com', 'eelmail.com',
  'einrot.com', 'einrot.de', 'eintagsmail.de', 'email-fake.com',
  'email-jetable.fr', 'email-tempobil.com', 'email60.com', 'emaildienst.de',
  'emailinfive.com', 'emailisvalid.com', 'emailmiser.com', 'emailproxsy.com',
  'emailsensei.com', 'emailtemporario.com.br', 'emailthe.net', 'emailtmp.com',
  'emailwarden.com', 'emailx.at.hm', 'emailxfer.com', 'emeil.in',
  'emeil.ir', 'emeraldwebmail.com', 'emz.net', 'enterto.com',
  'ephemail.net', 'etranquil.com', 'etranquil.net', 'etranquil.org',
  'evopo.com', 'explodemail.com', 'express.net.ua', 'extremail.ru',
  'eyepaste.com', 'emailondeck.com', 'emkei.cz', 'emailfake.com',
  'etempmail.com', 'emailfreedom.com',

  // F
  'fake-box.com', 'fake-email.tk', 'fakeinformation.com',
  'fakemailgenerator.com', 'fakemailz.com', 'fakemail.fr', 'fakemail.io',
  'fakemailgenerator.net', 'fansworldwide.de', 'fantasymail.de',
  'fastacura.com', 'fastermail.net', 'fastimap.com', 'fastmazda.com',
  'fastmitsubishi.com', 'fastnissan.com', 'fastsuzuki.com',
  'fasttoyota.com', 'fastyamaha.com', 'filzmail.com', 'fivemail.de',
  'fizmail.com', 'fleckens.hu', 'flitafebber.com', 'flurre.com',
  'fmailbox.com', 'fmailinbox.com', 'folkfan.de', 'forcebox.se',
  'frapmail.com', 'freebulk.com', 'freemail.ms', 'freundin.ru',
  'friendlymail.co.uk', 'front14.org', 'ftpinc.ca', 'fuckedupload.com',
  'futurum.ch', 'fux0ringduh.com', 'fyii.de', 'filtr.men',
  'fadingemail.com', 'fakedemail.com', 'fastermail.com', 'flexmail.eu',

  // G
  'galotv.com', 'garingal.org', 'garliclife.com', 'geronra.com',
  'get-mail.cf', 'get2mail.fr', 'getairmail.com', 'getonemail.com',
  'gettempmail.com', 'ghosttexter.de', 'girlmail.info', 'gishpuppy.com',
  'gmailboxes.com', 'gmai.com', 'gmial.com', 'goemailgo.com',
  'gorillaswithdirtyarmpits.com', 'gotmail.net', 'gotmail.org', 'grr.la',
  'guerillamail.biz', 'guerillamail.com', 'guerillamail.de', 'guerillamail.info',
  'guerillamail.net', 'guerillamail.org', 'guerrillamail.biz',
  'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info',
  'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'gustr.com', 'getmails.eu', 'givmail.com', 'greensloth.com',

  // H
  'h8s.org', 'hailmail.net', 'harakirimail.com', 'hartbot.de',
  'hatespam.org', 'herp.in', 'hidemail.de', 'hidzz.com',
  'hmamail.com', 'hochsitze.com', 'hooply.com', 'hotpop.com',
  'hulapla.de', 'humaility.com', 'hurify1.com', 'huskion.net',
  'hatmail.com', 'hellomailo.com', 'hidemy.email',

  // I
  'ieatspam.eu', 'ieatspam.info', 'ieh-mail.de', 'ihateyoualot.info',
  'iheartspam.org', 'ikbenspamvrij.nl', 'imails.info', 'inboxalias.com',
  'inboxbear.com', 'inboxclean.com', 'inboxclean.org', 'inboxdesign.me',
  'inboxkitten.com', 'incognitomail.com', 'incognitomail.net', 'incognitomail.org',
  'infocom.zp.ua', 'insorg-mail.info', 'ipoo.org', 'irish2me.com',
  'iwi.net', 'inoutmail.de', 'inoutmail.info', 'inoutmail.net',
  'inoutmail.org', 'inboxbear.com', 'ipsur.org',

  // J
  'jetable.com', 'jetable.fr.nf', 'jetable.net', 'jetable.org',
  'jnxjn.com', 'jourrapide.com', 'jsrsolutions.com', 'jupimail.com',
  'junkmail.com', 'jnxjn.com',

  // K
  'kasmail.com', 'kaspop.com', 'kcrw.de', 'keepmymail.com',
  'killmail.com', 'killmail.net', 'kir.ch.tc', 'klassmaster.com',
  'klassmaster.net', 'klzlk.com', 'koszmail.pl', 'kurzepost.de',
  'kasmail.com',

  // L
  'lawlita.com', 'lazyinbox.com', 'letthemeatspam.com', 'lhsdv.com',
  'lifebyfood.com', 'link2mail.net', 'litedrop.com', 'lol.ovpn.to',
  'lolfreak.net', 'lookugly.com', 'lortemail.dk', 'lpfmgmtltd.com',
  'lr78.com', 'lroid.com', 'lukop.dk', 'lukecarriere.com',
  'lastmail.com', 'letmetype.com', 'liveradio.tk',

  // M
  'm4ilweb.info', 'maboard.com', 'mail-filter.com', 'mail-temporaire.fr',
  'mail.by', 'mail.mezimages.net', 'mail.zp.ua', 'mail0.ga',
  'mail1a.de', 'mail21.cc', 'mail2rss.org', 'mail333.com',
  'mail4trash.com', 'mailbidon.com', 'mailbiz.biz', 'mailblocks.com',
  'mailbolt.com', 'mailc.net', 'mailchop.com', 'mailde.org',
  'maildrop.cc', 'maildrop.cf', 'maildrop.ga', 'maildrop.gq',
  'maildrop.ml', 'maildu.de', 'maileimer.de', 'mailexpire.com',
  'mailf5.com', 'mailfall.com', 'mailfirst.com', 'mailforspam.com',
  'mailfreeonline.com', 'mailfs.com', 'mailguard.me', 'mailhazard.com',
  'mailhazard.us', 'mailim.com', 'mailin8r.com', 'mailinater.com',
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  'mailinatorplus.com', 'mailisent.com', 'mailismagic.com', 'mailita.tk',
  'mailjunk.cf', 'mailjunk.ga', 'mailjunk.gq', 'mailjunk.ml',
  'mailjunk.tk', 'mailkupon.com', 'mailmate.com', 'mailme.gq',
  'mailme.ir', 'mailme.lv', 'mailme24.com', 'mailmetrash.com',
  'mailmoat.com', 'mailnew.com', 'mailnull.com', 'mailpick.biz',
  'mailplus.pl', 'mailproxsy.com', 'mailquack.com', 'mailrock.biz',
  'mailscrap.com', 'mailseal.de', 'mailshell.com', 'mailsiphon.com',
  'mailslapping.com', 'mailslite.com', 'mailsource.info', 'mailsucker.net',
  'mailtemp.info', 'mailtome.de', 'mailtothis.com', 'mailtr.es',
  'mailtrash.net', 'mailtv.net', 'mailtv.tv', 'mailwire.net',
  'mailzilla.com', 'mailzilla.org', 'makemetheking.com', 'manifestgenerator.com',
  'manybrain.com', 'mbx.cc', 'mega.zik.dj', 'meinspamschutz.de',
  'meltmail.com', 'messagebeamer.de', 'mierdamail.com', 'migmail.pl',
  'migumail.com', 'mintemail.com', 'misterpinball.de', 'mMailing.net',
  'mmmmail.com', 'moburl.com', 'mohmal.com', 'moncourrier.fr.nf',
  'monemail.fr.nf', 'monmail.fr.nf', 'monumentmail.com', 'moonwake.com',
  'moreorcs.com', 'motique.de', 'mountainregionallibrary.net', 'mox.pp.ua',
  'mt2014.com', 'mt2015.com', 'mt2016.com', 'mx0.wwwnew.eu',
  'my10minutemail.com', 'myalias.pw', 'mybx.net', 'mycard.net.ua',
  'mycleaninbox.net', 'myemailboxy.com', 'mymail-in.net',
  'mymailboxpro.org', 'mypacks.net', 'mypartyclip.de', 'myphantomemail.com',
  'mysamp.de', 'myspamless.com', 'mytempemail.com', 'mytempmail.com',
  'mythrashmail.net', 'mytrashmail.at', 'mytrashmail.com',
  'mytrashmail.me', 'mytrashmail.net', 'mailnesia.com', 'mailappareil.com',
  'mailnew.com', 'mailsac.com', 'mailtemp.net', 'mailtemporaire.com',
  'mailtemporaire.fr', 'mega-post.com', 'minutemail.com',

  // N
  'nada.email', 'nada.ltd', 'nakedtruth.biz', 'neomailbox.com',
  'nervmich.net', 'nervtmich.net', 'netcenter-vn.net', 'netricity.nl',
  'netviewer-france.com', 'newairmail.com', 'newmail.top', 'nextstopvalhalla.com',
  'nfast.net', 'niftynitwit.com', 'nigge.rs', 'njmail.com',
  'no-spam.ws', 'noblepioneer.com', 'nobulk.com', 'noclickemail.com',
  'nomail.pw', 'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com',
  'nonspam.eu', 'nonspammer.de', 'noref.in', 'norseforce.com',
  'notmailinator.com', 'nowhere.org', 'nospamfor.us', 'nospamthanks.info',
  'notmanymails.com', 'nowmymail.com', 'nuo.co', 'nullbox.info',

  // O
  'objectmail.com', 'obobbo.com', 'odnorazovoe.ru', 'one-time.email',
  'onemail.top', 'onewaymail.com', 'online.ms', 'opentrash.com',
  'ordinaryamerican.net', 'otherinbox.com', 'ourklips.com', 'outlawspam.com',
  'ovpn.to', 'owlpic.com', 'owlpic.net',

  // P
  'paplease.com', 'payspade.com', 'pecinan.com', 'pecinan.net',
  'pecinan.org', 'pepbot.com', 'peterdethier.com', 'pimpedupmyspace.com',
  'pingir.com', 'pjjkp.com', 'plexolan.de', 'poh.pp.ua',
  'politikerclub.de', 'pooev.com', 'postacin.com', 'postinbox.com',
  'postpro.net', 'privacy.net', 'privatdemail.net', 'privy-mail.com',
  'privy-mail.de', 'privymail.de', 'proxymail.eu', 'prtnx.com',
  'prtz.eu', 'punkass.com', 'putthisinyourspamdatabase.com',
  'protonmail.com.temp.email', 'privacy-mail.net',

  // Q
  'qq.com', 'quickinbox.com', 'quickmail.in', 'quickmail.nl',
  'quickmail.rocks',

  // R
  'r4nd0m.de', 'rainmail.biz', 'ratt.de', 'rcpt.at', 'recode.me',
  'recursor.net', 'recyclemail.dk', 'regbypass.com', 'rklips.com',
  'rmqkr.net', 'rootfest.net', 'randommail.net', 'rppkn.com',
  'rtrtr.com',

  // S
  's0ny.net', 'safe-mail.net', 'safetymail.info', 'safetypost.de',
  'sandelf.de', 'sanstr.com', 'saynotospams.com', 'schachrol.com',
  'schrott-email.de', 'secretemail.de', 'secure-email.org',
  'selfdestructingmail.com', 'sendspamhere.com', 'sharklasers.com',
  'shieldemail.com', 'shiftmail.com', 'shitmail.me', 'shitware.nl',
  'sipemail.com', 'skeefmail.com', 'sl.pt', 'slaskpost.se',
  'sleepingbeauty.de', 'slippery.email', 'slopsbox.com', 'slushmail.com',
  'smellfear.com', 'smwg.info', 'snakemail.com', 'sneakemail.com',
  'sneakmail.de', 'snkmail.com', 'sofimail.com', 'sofort-mail.de',
  'sogetthis.com', 'soisz.com', 'spam.la', 'spam.mn',
  'spam.org.tr', 'spam4.me', 'spamail.de', 'spambob.com',
  'spambob.net', 'spambob.org', 'spambog.com', 'spambog.de',
  'spambog.ru', 'spambooger.com', 'spambox.info', 'spambox.irishspringrealty.com',
  'spambox.us', 'spamcannon.com', 'spamcannon.net', 'spamcero.com',
  'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com', 'spamcowboy.net',
  'spamcowboy.org', 'spamday.com', 'spamex.com', 'spamfree24.org',
  'spamgoes.in', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'spamherelots.com', 'spamherelots.net', 'spamhereplease.com',
  'spamhole.com', 'spamify.com', 'spaminmotion.com', 'spamkill.info',
  'spaml.com', 'spaml.de', 'spammotel.com', 'spammy.host',
  'spamoff.de', 'spamsalad.in', 'spamslicer.com', 'spamspot.com',
  'spamstack.net', 'spamthis.co.uk', 'spamtrap.ro', 'spamtraps.net',
  'spamtroll.net', 'speed.1s.fr', 'spoofmail.de', 'squizzy.de',
  'squizzy.eu', 'squizzy.net', 'stinkefinger.net', 'streamline.to',
  'supermailer.jp', 'superrito.com', 'superstachel.de', 'suremail.info',
  'svk.jp', 'sweetxxx.de', 'spamgap.com', 'spamobox.com',
  'spam4.me', 'spamspot.com', 'stpemail.com', 'surefire-temp.com',

  // T
  'tafmail.com', 'tagmymedia.com', 'tagyourself.com', 'talktome.com.au',
  'tapchief.com', 'taptaptap.io', 'techemail.com', 'techgroup.me',
  'teewars.org', 'teleworm.com', 'teleworm.us', 'temp-mail.de',
  'temp-mail.org', 'temp-mail.ru', 'temp.emeraldwebmail.com', 'temp.headstrong.de',
  'tempail.com', 'tempalias.com', 'tempe-mail.com', 'tempemail.biz',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net', 'tempinbox.com',
  'tempinbox.co.uk', 'tempmail.com', 'tempmail.de', 'tempmail.eu',
  'tempmail.it', 'tempmail.net', 'tempmail.org', 'tempmail.us',
  'tempmail2.com', 'tempmailer.com', 'tempmailer.de', 'tempr.email',
  'tempremail.net', 'tempsky.com', 'tempthe.net', 'tempymail.com',
  'thanksnospam.info', 'thecloudindex.com', 'thisisnotmyrealemail.com',
  'throam.com', 'throwam.com', 'throwaway.email', 'throwwwaway.me',
  'tilien.com', 'tmail.com', 'tmail.ws', 'tmailinator.com',
  'toiea.com', 'toomail.biz', 'topranklist.de', 'tosunkaya.com',
  'tradermail.info', 'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash-mail.ga', 'trash-mail.io', 'trash-mail.me', 'trash-mail.net',
  'trash-me.com', 'trashdevil.com', 'trashdevil.de', 'trashemails.de',
  'trashinbox.com', 'trashmail.at', 'trashmail.com', 'trashmail.de',
  'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  'trashmailer.com', 'trashme.site', 'trashtipper.com',
  'trbvm.com', 'trbvn.com', 'trollproject.com', 'tropicalbass.info',
  'tslashiota.tk', 'ttttt.com', 'turoid.com', 'twinmail.de',
  'tyldd.com', 'tempail.com', 'temporaryemail.com', 'temporaryemail.net',
  'tempr.email', 'throwam.com', 'throwawaymail.com', 'tmpmail.net',
  'tmpmail.org', 'tmpjunk.com', 'trbvn.com', 'trashcan.email',

  // U
  'uggsrock.com', 'umail.net', 'unids.com', 'unmail.ru',
  'uorak.com', 'uroid.com', 'used.hu', 'usermail.com',
  'utiket.co', 'ux.dnsabr.com',

  // V
  'valemail.net', 'venompen.com', 'veryrealemail.com', 'vidchart.com',
  'viditag.com', 'viewcastmedia.com', 'viewcastmedia.net', 'viewcastmedia.org',
  'viralplays.com', 'vmailing.info', 'vmani.com', 'vomoto.com',
  'vpn.st', 'vps.tt', 'vsimcard.com', 'vsocial.com',

  // W
  'w3internet.co.uk', 'walala.org', 'walkmail.net', 'walkmail.ru',
  'watchever.biz', 'webemail.me', 'webm4il.info', 'webuser.in',
  'welikecookies.com', 'whyspam.me', 'wilemail.com',
  'willhackforfood.biz', 'willselfdestruct.com', 'wmail.club',
  'wolfsmail.tk', 'worldspace.link', 'wuzupmail.net',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whereua.com',

  // X
  'xagloo.co', 'xagloo.com', 'xcompress.com', 'xemaps.com', 'xents.com',
  'xjoi.com', 'xl.cx', 'xmail.com', 'xn--9kq967o.com',
  'xoxy.net', 'xww.ro', 'xy9ce.tk',

  // Y
  'yamail.win', 'yepmail.net', 'yert.ye.vc', 'yodx.ro',
  'yogamaven.com', 'yopmail.com', 'yopmail.fr', 'yopmail.gq',
  'yopmail.net', 'yopmail.org', 'ypmail.webarnak.fr.eu.org', 'yuurok.com',
  'yantmail.com', 'yeahyeah.com',

  // Z
  'z1p.biz', 'za.com', 'zehnminutenmail.de', 'zetmail.com',
  'zippymail.info', 'zomail.org', 'zom.bi', 'zumit.net',
  'zxcv.com', 'zxcvbnm.com', 'zzz.com', 'zainmax.net',

  // Additional modern services & aliases
  'ahem.email', 'altmails.com', 'anonymbox.com', 'anti-spam.ws',
  'antispam24.de', 'armyspy.com', 'bspamfree.org', 'cameleo.com',
  'catamail.com', 'correcttheweb.com', 'discard.email', 'dispostable.com',
  'dodgeit.com', 'einrot.com', 'emailondeck.com', 'emkei.cz',
  'fakemailz.com', 'firemailbox.club', 'foro.to', 'freundinnen.ws',
  'gardenscape.ca', 'get-mail.cf', 'getamailbox.org', 'getmails.eu',
  'gishpuppy.com', 'gmial.com', 'greensloth.com', 'guerillamail.com',
  'haltospam.com', 'hidden.team', 'hopemail.biz', 'ibigroup.io',
  'inboxbear.com', 'instant-email.org', 'itsme.team', 'jnxjn.com',
  'junk.to', 'keepmymail.com', 'kurzepost.de', 'letmetype.com',
  'lortemail.dk', 'luxusmail.org', 'mail.com.ua', 'mailbox52.com',
  'mailboxprotector.com', 'mailcat.biz', 'mailcatch.com', 'maildrop.cf',
  'maileimer.de', 'mailexpire.com', 'mailfence.com.spamgate',
  'mailguard.me', 'mailimate.com', 'mailinator.com', 'mailismagic.com',
  'mailmoat.com', 'mailnew.com', 'mailnull.com', 'mailproxsy.com',
  'mailsac.com', 'mailshell.com', 'mailslite.com', 'mailsucker.net',
  'mailtemp.net', 'mailtothis.com', 'mailtrash.net', 'mailzilla.com',
  'meltmail.com', 'mfsa.ru', 'migumail.com', 'mohmal.com',
  'mt2016.com', 'myalias.pw', 'mycleaninbox.net', 'myemailboxy.com',
  'nada.email', 'nomail.xl.cx', 'notmailinator.com', 'nospam.ze.tc',
  'one-time.email', 'onewaymail.com', 'owlpic.com', 'pecinan.com',
  'plexolan.de', 'pookmail.com', 'postinbox.com', 'privacy-mail.net',
  'protonmail.name', 'punkass.com', 'quickinbox.com',
  'quickmail.rocks', 'recyclebox.org', 'rootfest.net',
  'safemail.net', 'safe-mail.org', 'sandelf.de', 'shieldedmail.com',
  'shredmail.com', 'simpleitsecurity.info', 'simplysecure.cc',
  'slippery.email', 'slushmail.com', 'smwg.info', 'sneakemail.com',
  'sogetthis.com', 'spamgap.com', 'spamgoes.in', 'spamgourmet.com',
  'spamhereplease.com', 'spaminmotion.com', 'spamspot.com', 'speed.1s.fr',
  'stinkefinger.net', 'streamline.to', 'superrito.com', 'suremail.info',
  'tafmail.com', 'tagyourself.com', 'temp-mail.io', 'tempinbox.co.uk',
  'tempmail.ninja', 'throwaway.email', 'tilien.com',
  'tmailinator.com', 'trashmail.at', 'trbvm.com', 'trollproject.com',
  'turoid.com', 'twinmail.de', 'uroid.com', 'vomoto.com',
  'webemail.me', 'wegwerfmail.de', 'whyspam.me', 'wilemail.com',
  'xagloo.com', 'xents.com', 'yepmail.net', 'yopmail.com',
  'z1p.biz', 'zehnminutenmail.de', 'zom.bi', 'zzz.com',
]);

const ROLE_PREFIXES = new Set([
  'abuse', 'admin', 'administrator', 'billing', 'bounce',
  'ceo', 'cfo', 'cio', 'coo', 'cto',
  'contact', 'complaints', 'devnull', 'do-not-reply', 'do_not_reply',
  'dns', 'email', 'errors', 'ftp', 'help',
  'helpdesk', 'hostmaster', 'hr', 'info', 'it',
  'legal', 'mail', 'mailerdaemon', 'mailer-daemon', 'marketing',
  'news', 'newsletter', 'nobody', 'noreply', 'no-reply', 'no_reply',
  'null', 'office', 'ops', 'phishing', 'postmaster',
  'privacy', 'register', 'registrar', 'root', 'sales',
  'security', 'service', 'services', 'shop', 'spam',
  'support', 'sysadmin', 'tech', 'test', 'trouble',
  'undisclosed', 'unsubscribe', 'usenet', 'uucp', 'webmaster',
  'welcome', 'www',
]);

export function isDisposable(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

export function isRoleBased(localPart: string): boolean {
  return ROLE_PREFIXES.has(localPart.toLowerCase());
}
