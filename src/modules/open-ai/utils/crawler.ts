const urlRegex =
  /^(https?:\/\/)?([\w.-]+\.[a-zA-Z]{2,}|[\w.-]+\.[a-zA-Z]{1,3}\.[a-zA-Z]{1,3})(\/\S*)?$/;

export const isValidUrl = (url: string): boolean => {
  return urlRegex.test(url);
};

interface HardCoded {
  [key: string]: string;
  // Other properties and their types
}

export const hardCoded: HardCoded = {
  "harmony.one/dear": `
  . 👩‍💻 Dear Engineer, Our Tech Lead Role in 🌲 Palo Alto...
AUG 6, 2023
… is open! As Harmony’s founder, I’d like to tell you below about the project, your role, and what we are looking for from you.
Ideally you specialize in performance, security and systems – with 3 years of working experience, a degree in computer science, and regular practice of open-source development. You may have built a kernel, a compiler, or a database from scratch before; you enjoy Hacker News, functional idioms, and productivity tools every day.
This “Tech Lead” role is full-time, permanent, onsite in our Palo Alto headquarters in California. The compensation, with a base salary and vesting equity, may range from $160K to $210K. We offer full benefits but not a working visa. You should live within a 30-minute commute to work in office every day; you must love the long work hours and the chaotic grind of startups over years.
We have 6 full-time teammates in office, 15 more across Europe and Asia. You will be working directly with the leadership team of myself, Casey, and Aaron. I lead the team in platform vision, market strategy, and product roadmap. Casey leads in protocol research, network system, and developer community. Aaron leads in backend architecture, product design, and user applications.
You may start with our current initiatives on AI bots, Telegram wallets, domain auctions… then explore our broader roadmap of decentralized protocols, financial products, or cryptographic primitives. Harmony’s mission is “to scale trust and create radically fair economy”. Our next milestones include crypto payments for AI models and products on Telegram, social wallets without separate passwords or devices, and sustainable collectible auctions for .country domains.
Harmony is among the first proof-of-stake, sharding blockchains. Our 2-second transaction finality is one of the fastest; our 1000-slot validator network is one of the most diverse. The project started 5 years ago – launching the network and the ONE token in 2019, staking and delegation in 2020, DeFi and NFT in 2021, DAO and ZK Proofs in 2022, and now Web3 domains and AI bots in 2023. Harmony is venture-backed with its network utility tokens available on crypto exchanges and its treasury of more than 3 years of runway.
You will be challenged to launch features within the first few weeks, and soon to lead a team of 2 to 4 engineers. You will develop an open blockchain of hundreds of network nodes with hundreds of millions of assets. You will pioneer how applying generative models, low-rank adaptation and edge-device inference will bring productivity as well as entertainment to millions of users. You will be an industry leader, engaging in public forums or with our developer ecosystem, not only for your technical expertise but also your empathetic value.
Our backends, written in Go, run on Amazon and other clouds. Our middlewares, written in Solidity, deploy as Ethereum smart contracts. Our frontends, written in Javascript, deploy as React applications. As our commitment to open development and community blockchain, we share all code as public repos on Github and we share development meetings as public videos on YouTube.
You will first have a full-hour interview each with Li, Kushagra and myself in office. Li leads on operations, while Kushagra advises and consults on human resources. You will send in advance your past sample work of a full-page writing and a 100-line code snippet. You will join our lunch to chat with other teammates. The next steps are technical interviews with Aaron and Casey on Zoom, another day of onsite sessions, and finally a 2-day paid joint-work session. The decision and the offer usually come within 24 hours. Your employment may start within a week, ideally before October 15th.
Apply now on harmony.one/lever? You may learn more from the long posts “ONE Bot on Telegram for AI” and “Radically Fair for 1.country” on my Substack blog.s.country. Feel free to contact me anytime via s@harmony.one or Telegram @stephentse.
  `,
  "harmony.one": `
Can you reply with just text with no links or formattting or anything:
Harmony ONE
Harmony is an open and fast blockchain. Our mainnet runs Ethereum applications with 2-second transaction finality and 100 times lower fees. AI developers can use onchain tokens for micro-payments, smart contracts for market pricing, and zero-knowledge proofs for data privacy.
Harmony’s mission is to scale trust and create a radically fair economy. Our platform is decentralized, scalable and secure to settle any transactions without trusted parties.
🕒Products · 👨‍👩‍👧‍👦News · 🤝Protocol · 🌳Ecosystem · 🌊Creative · 🧗‍♀️Roadmap
🧚‍♀️ Telegram AI Bot & 1.country Web3 Domains
notion image
Try our Telegram AI bot? Use ONE tokens for ChatGPT4, Stable Diffusion XL photorealism, voice meeting summarization.
Free SSL certificates, Notion custom hosting – all ready in 5 minutes. Own single-letter domain NFTs like h.country.
➡️ Our AI ∩ Crypto blog on Web3 future
🕒 Decentralized Products: Onchain Security
We are an open platform for your assets, collectibles, identity and governance. Our protocol decentralizes coordination among global communities – by enforcing contracts without trusting third parties or prior rules.
notion image
Defira immersive DeFi role-playing adventure game
notion image
Layer Zero Bridge secure & cross-chain transfers
notion image
Gnosis Multisig shared asset custody & control
notion image
Timeless Wallet native mobile & social experience
notion image
Swap capital efficient liquidity pools
notion image
Hummingbot open source market making
➡️ Explore our DeFi yields & NFT collections
👨‍👩‍👧‍👦 Community News: Radical Transparency
Harmony aims for open governance and vibrant participation of our ecosystem.
More news & announcements…
➡️ Subscribe to our newsletters & tweets
🤝 Blockchain Protocol: Scaling & Security
Harmony’s vision is to create cooperation for global communities, and scale their digital economies.
1. Secure, Random State Sharding
Harmony has transcended the blockchain trilemma by bringing the best research to production. Sharding is proven to scale blockchains without compromising security and decentralization.
We divide not only our network nodes but also the blockchain states into shards, scaling linearly in all three aspects of machines, transactions and storage.‍ To prevent single shard attacks, we must have a sufficiently large number of nodes per shard and cryptographic randomness to re-shard regularly. Each shard has 250 nodes for strong security guarantee against Byzantine behaviors. We use Verifiable Delay Function (VDF) for unbiasable and unpredictable shard membership.
2. Effective PoS & Token Economics
Harmony has designed a novel Proof-of-Stake (PoS) mechanism for network security and economics. Our Effective Proof-of-Stake (EPoS) reduces centralization and distributes rewards fairly to thousands of validators. Our staking mechanism supports delegation and reward compounding.
To support 100% uptime but fully open participation, EPoS slashes validators who double-sign and it penalizes elected but unavailable nodes.Harmony Economics Model caps the annual issuance at 441 million tokens (about 3% rate in long term). Our model gives validators a simple and predictable return. All transaction fees are burnt to offset the issuance, naturally leading to zero inflation when our network usage becomes high.
3. Fast Consensus, Instant Finality
Harmony has innovated on the battle-tested Practical Byzantine Fault Tolerance (PBFT) for fast consensus of block transactions. Our Fast BFT (FBFT) leads to low transaction fees and 1-block-time finality in Harmony Mainnet.‍
We use Boneh–Lynn–Shacham (BLS) constant-sized signatures to commit blocks in a single round of consensus messages. We achieve 2-second block time with view changes in production against adversarial or unavailable leaders.‍ Harmony Mainnet was launched in June 2019. Our network has produced 41M blocks with 772k transactions in publicly traded, native ONE tokens.
4. Keyless Smart Wallets
Resilient. Funds are recoverable through time locks and multiple safety nets. No single point of failure such as thefts, cracks, loss, censorship or coercions is catastrophic.
Sufficient. All steps are well defined without delegating to hardware devices or seed phrases in safety boxes. Users do not need any passwords or rely on biometrics.
Composable. One-time or low-entropy passwords are useful for small funds. Multiple authentications can independently boost protection thresholds against brute-force.
Self-Sovereign. No third parties, government documents, designated guardians, backup servers or hardware enclaves are necessary. Users have full custody and self control.
➡️ Join our governance discussion & zero-knowledge proof course
🌳 Ecosystem Partners: Open Development
A blockchain, as a marketplace full of incentives, allows anyone to create tokens, secure transactions between parties, and accrue values from serving utility.
👝 Protofire Multi-signature wallet
🤖 Hummingbot Market making
💫 InfStone Staking validator
🎸 dj3n Creator-fan Collectibles
💬 SMS Wallet Light asset custody
📈 CoinMarketCap Exchange markets
📚 Common Prefix Production research
➕ Add3 Smart contract deployer
👨‍🎤 MAD Collectible marketplace
🗳️ Snapshot Governance voting
🛡️ SlowMist Security audit
🏂 SporkDAO Ethereum Denver
🦙 DeFiLlama Asset locked dashbaord
🪄 Magic Authentication services
⚾ Rosetta Coinbase Data API
🏫 Defiant DeFi education
🔄 Swap Capital efficient liquidity pools
🦊 MetaMask Mobile & browser wallet
0️⃣ zkDAO Cryptography scholars
🌳 Blue Forest ZKProof game
🌐 Pocket Networks Service endpoints
🏦 Aave Lending pools
🪝 Curve Stable pools
🦙 DefiLlama Yield dashboard
🛫 Travala Travel payments
🔗 Chainlink Data oracle
🔑 NFTKey Collectible marketplace
☢️ DappRadar User & activity ranking
🦶Footprint Analytics dashboard
👩‍💻 Gitcoin Hackathon bounties
💽 Band Data oracle
📊 Graph Data indexing
➡️ Reach us at Discord or open voting
🌊 Creative Campaigns: The ONEs Who Build
They believe in radical social change. ONE where trust is not needed to participate. ONE where everyone can sing in harmony. And we will be the ONEs to build it.
Video preview
Video preview
Video preview
Video preview
Video preview
➡️ Tell us your story or design
🧗‍♀️ 2023 Roadmap: Sustainable Economy
We are a Day-1 startup. Blockchains are becoming the foundation of the global economy, yet their adoption is at only 1%. That means that you as a pioneer and developer are shaping the future with 10X impact. Harmony is a community-driven project, a network with hundreds of applications, and a team wearing crazy ambitions on their sleeves. Because the invincible summer awaits!
✅ Domain Affiliates
✅ Native Stablecoin
✅ Validator Economics
State Sync & Pruning
Account Abstraction
✅ Telegram AI Bots
Model & Agent Markets
Radical .1 Markets
1-Second Finality
Onchain Registrars
Domain Auctions
Social Recovery Wallets
➡️ Join our team & code development
Substack · Twitter · YouTube · Reddit
Discord · Telegram · Instagram · Linkedin
©️ Harmony 2023 💌 hello@harmony.one
Buy Tokens
Exchanges
Staking
Explorer
Open Source
Developer Docs
Whitepaper
Token Economics
Your Career
Community Forum
Open Development
Branding Kits 
  `,
"harmony.one/q4": `
  ONE Bot 🧚‍♀️: Upcoming Features ❤️‍🔥
🚀
ONE Bot 🧚‍♀️: Upcoming Features ❤️‍🔥
Upcoming features for our beloved @harmony1bot: Expert shortcuts + context loading; Chat on website or documents or transcripts; Custom image models or characters; Phone conversations with intent. Join our development + user group @onebotlove!
Our Q4 goals are 100 custom Stable Diffusion models (from CivitAI and HuggingFace), 1000 public and private data sources (as GPT4 context or embeddings), and $100K @harmony1bot revenues and tokens with 5 developers or modelers or trainers. 
Our 3 key metrics are: the total fees users pay in ONE tokens (excluding the initial 100 ONE credits), weekly active users (the total unique Telegram accounts in the last 7 days), weekly user engagement (the total messages sent to bot in the last 7 days). 
Let’s focus on G – not for AGI (artificial general intelligence), but Gen (generative) AI with large language model (LLM).
 
🎿
OnlyBots: Gen (AI) Tokens for Models, Embeds & Trainings
💍 ONE (Bot) Love – For ALL your AI (Wishes) 🧚‍♀️! @onebotlove
Many models, agents, characters.. as ONE bot @harmony1bot.
A user group to #build 100+ productivity, entertainment, personalization.. in harmony.
Pay-PER-Use, not $20 monthly. SMALL social groups, discreet & omnipresent.
💬 /ask: Ask Me Anything – ChatGPT4
/translate LANGUAGE1 LANGUAGE2: Auto-detect source language, and repeat all chat messages with translation in multiple target languages. E.g. /translate en zh-HK zh-CN.
/sum URL: Crawl the website URL in our backend, then summarize the content with OpenAI ChatGPT4 + 32K context.
✅ E.g. /ask harmony.one/dear or . harmony.one/dear. 
(1024 bytes downloaded, 0.42 time elapsed, 0.3 ONE fees paid.)
✅ E.g. /sum harmony.one/dear, or /sum harmony.one/dear in 30 words. Then, all Substack and Notion content. 
🔥 /sum URL as USER with PASSWORD: use login credentials in plaintext for gated access, or via archive.org and archive.is for paywalls. E.g.  /sum www.wsj.com/articles/amazon-shines-during-apples-off-season-7f27fc58 with user email and password.
✅ Alias as “/ask summarize URL”,  and preprocess to expand all URL in /ask queries. E.g. /ask project mission inharmony.one/dear. 
Support dynamic or generated pages via a headless browser with Javascript execution. Later, support LangChain’s document loaders & transformers. 
Compare results with GPT4 (with plugins) on parsing and extracting – versus HTML/CSS preprocessed as plain text with optimized parsers.
Upload a PDF or Word or Excel file as Telegram messages, then /ask with the context of the document. Support 1000+ pages with chunking – to lift the limit of about 250 words or 500 tokens per page, or 64 pages for GPT4-32K token context window length. Or, use Anthropic’s 100K context.
/load URL. Recent public news, events, data as a prelude into the token context window. E.g. restaurant openings, theater trends, quarterly earnings. Initially, Creative Common only (instead of Crunchbase, Factual, NumeriAI). Later, a vector dataset marketplace for micro-payment and loyalties on base, derived or forked sets. 
Must be recent, otherwise foundational models are trained with all public data every few months. Must be small, only 32K context window (for GPT-4). In contrast, loading a specific news article gives much more depth and consistency on a well-scoped context; loading all movie characters, restaurant ratings, court filings, comedy sketches… requires vector stores as embeddings and similar search.
Celebrity or personality chat. Train on the transcripts of all available podcasts on a single person. E.g. 25k words and 143k characters for one 3-hour episode of Yuval Noah Harari with Lex Friedman.
📸 /image: Make a Photo – Stable Diffusion
/image take photo as reference input, via tagging Telegram messages with @harmony1bot, for project logos or brand characters. Already supported on Midjourney and RunwayML.
✅ /image model=MODEL embed=TRIGGER. Support 100 custom models and low-adaptation ranking (LoRa) from CivitAI. See its top creators, most popular images, and weekly metrics. Favorites: ar, dg, il, jl, tk, li, cg, aa, ac, jl.
/train. Upload 10 photos and train a new model – for celebrity, self, brand, comics characters. Support standard professional headshots for resume or bio pages. Lensa made $1M+ per day at launch.
/tell. Upload a photo, segment all objects, describe scenes, identify objects, add links under output words for image search or commerce purchase. Use Meta’s Segment Everything; use ChatGPT4 for further queries. A special but useful case, like object character recognition (OCR), is for whiteboard handwritings of in-person brainstorming as idea mazes.
/gif. Use style transfer to make Telegram animations, virtual gifts, or emoji reactions (from top domains or live docs). Rent an emoji character (among 3664 in Unicode) as Web3 identity, then combine up to 9 emoji icons as the social group logo. Telegram, Whatsapp, Line, Snap… each has $100M revenue to sustain 10+ years of development.
🗣️ /call: Phone Calls with Intent – Whisper
/call RESTAURANT. DATE, TIME, PEOPLE, SEATING, NOTES. NAME, CALLBACK. Not only synthesize speech from words, but to make a full phone call of conversations – with an intended goal to achieve. E.g. french laundry, napa valley. this fri 8/31, 6pm, 2 adults, 4 kids, outdoor patio, no allergy. stephen tse, (650)253-0000. 
/call PHONE. MESSAGE. E.g. (650)253-0000. grandma, i’ll be…
/answer via Twillo for picking up any calls. Instead of recording a voice message, answer with “Out of Office”, or verify the caller’s identity and importance, or fool spammers… – then full transcribe it to Telegram chat for semi-synchronous interactions or callbacks. 
🤩 Social Tokens & Emotion Capital
What do Web2’s OnlyFans and Web3’s friend.tech have in common? Social capital as tokens. OnlyFans made $5.6B revenues by 3.1M Gen Z creators in 2022, while friend.tech made $3.22M fees from $70.1M inflows among 100+ Gen Y influencers in 15 days. 
Now – let’s build a sustainable, onchain economy for Web∞’s HuggingFace and CivitAi. We are OnlyBots of Gen AI, on Harmony’s x.country, with generative models, vector embeddings, and low-rank trainings.
/tweet. User shares news article as URL on iOS, then ONE Bot tweets on x.com/stse its curated content by summarizing with key facts of metrics, timeline, conclusions – rather than original click-optimizing titles and opening sentence in web previews. 
It quotes the article text with focus on a predefined list of interest topics, opinionated takes based on earlier context and choice, and generate a new memetic image based on brand logos or popular characters. It can sprinkle emojis and hashtag slangs throughout the content, or expand it into long threads.
/intro @stephentse. friend.tech with tokens on connections and time slots. Using Karma3 reputation scores on Farcaster and Lens, as well as invite links with Timeless Wallet. 
Emoji reactions as shortcut commands:
📈 key numbers, 📊 metrics, 🔑 terms, 👨‍👩‍👧‍👦 names, 📅 dates, ⏳ time, 🚀 actions
👧 explain like i am 10, 👩‍⚕️ explain like i had a phd
1️⃣ summarize in 10 words, 3️⃣ sum in 30 words, 9️⃣ 99
/quote PERSON TOPIC. Get the best quote from the person on the topic, using earlier chats or surrounding context (group name, sender name, time, location). e.g. /quote jobs zen, is very close, but without the context, to “/ask jobs zen in isaacson book”.
/rem X: Y for remembering X is associated with Y, and /rem X? for recalling X. Using a key-value database for long-term memory of social groups. E.g. introduction with curated bio for each in a large social groups, /rem @yozi_eth: Zi Wang worked on Google Chrome, Google X, Android and Nexus from 2006-2015. He was Google’s first  global creative director for its hardware division and co-founded a Google research lab. E.g. /rem all googlers?
🤩 More for Expert Users
/333. Alias for making a 3x3x3 hierarchy summary: “X for Y but Z” on the top concepts, then 9 words in a proper sentence as a tag line on each of X, Y, Z – totally 27 lines as a 1-pager. Or, explain roadmap for the next 3 weeks, 3 months, and 3 quarters. Useful as a pitch story or study guide. E.g. “Uber for Kids but FREE”.
/mark 7. Highlight 7 phrases of the text in bright yellow – as the extractive summary but inlined for easy context.
/tag 5. Underline 5 of the most difficult terms of the text – with click links to explain in simpler terms, or cross-reference to its definition or usages inside the text. 
/timer INTERVAL TIME TEMPLATE for INPUT-LIST. E.g. /timer daily 10am quote steve on _ for work, life, love, style, health, food, art…
/save or /load CONTEXT. E.g. predefined restaurant lists, selection criteria, private meal reviews. As Custom instructions for ChatGPT but with multiple and indexed filings. 
/cite. Extract relevant parts from a blog or document URL – based on the current group  messages of questions and answers. For assisting “Ask Me Anything” (AMA) as founder interviews, customer support, or community management.
/make. Fork ONE bot with OpenAI Copilot – for your Zapier’s or Auto-GPT’s automations.
🔥 Tips, Aliases & Shortcuts
Extensive command aliases; optimized for beginner easy onboarding, desktop power uses and mobile casual demos. 
For example, the full slash command “/ask” or “/chat” or tagging with the bot Telegram username @harmony1bot for intuitive naming and meaning, but just the dot “.” or “/a” for quick typing, while “A.” or “a.” is the easiest to type on mobile phone (just “a”, double space for “.”, without shift for “.”). That is, use any of these aliases for the most commonly used interactions: /a /ask /chat A. a. . @harmony1bot. 
See the subpage here for the full list of aliases for all single letters, single symbols, double letters, and alternative wording.
🔥
ONE Bot: Tips, Aliases & Shortcuts
💡 Key Reference 
Context length is especially important for Retrieval Augmented Generation (RAG; Lewis et al., 2020) – which has emerged to be the predominant pattern for LLM industry use cases… this percentage would be even higher for enterprise use cases. For example, say a company builds a chatbot for customer support, for this chatbot to answer any customer question about any product, the context needed might be that customer’s history or that product’s information.
 `,
 "https://xn--qv9h.s.country/p/one-bot-for-all-generative-ai-on": `
 💍 ONE Bot on Telegram for ALL Your AI (Wishes) 🧚
AUG 11, 2023
Can you access ALL possible AI models, agents, characters, services… as ONE bot in a harmonious interface that already has 1 billion users? How about Pay-per-Use rather than $20 monthly subscriptions for each of the hundreds of automation, intelligence, personalization… yet to come?

Why not chat with AI as if HER identity is another friend among your inner circles, or just a coworker on a pizza-small team, or some assistant among small customer groups? Among these SMALL social groups, such ONE bot will be helpful but discreet, omnipresent without distracting – boosting both the productivity and the entertainment of your life?

🤗 Small Social Groups
The future of social is Web3: anonymous in public but soul-bound reputable over years, permission-less to join but be ready for rage kicks, power votes for rights but social norms to maintain liveness.

We now live and work in Web∞ with AI bots where you will have hundreds of small social groups mixing your friends, coworkers, or even customers. No more being tied to a few centralized platforms with hundreds of connected or followed profiles.


Prompt? Broken but Together (Michael Benisty, Burning Man)
But how these groups share the payments and fees of AI bots? Better yet, can they create value together, sustaining to be a community of culture and wealth? Most certainly, yes. ONE bot can easily join any chat group of your choice of people, or your choice of different purposes and interests. So fluid group membership easily implies asset ownership, while emoji-reaction engagement implies governance like multi-signatures.

Now you see that Harmony is more than a network of validators or a platform of transactions – we innovate on the consensus protocol for people. Simply put and true across all systems, communication scales quadratically with n^2 message rounds for the n team size. Amazon argues the optimal size of productive team is measured by fitting them in a room and sharing a pizza or two – so 6 to 8 people as the best functional sub-team, depending on the strength of the leader to overcome the (wo)man-month myth.

Hence, keep your identity small in political ideals or professional reputation – much like a good programming interface in a pure, functional way. Remember, 51% majority is not consensus. And, Never Split the Difference between the given narrative of Democrats vs Republicans, China vs U.S., or life vs work.

🌟 New Forum for AI ∩ Crypto? 🪢Reddit, 💬Discourse, 🏴‍☠️Hacker News
STEPHEN TSE
·
JUN 20
🌟 New Forum for AI ∩ Crypto? 🪢Reddit, 💬Discourse, 🏴‍☠️Hacker News
For Harmony’s 🧠 AI ∩ 🌳 Crypto projects, which community forum would you like to spend most time on? Interact with most people? Most productive vs most lasting? So I can discuss news hourly ⏱️ with minimal text (Hacker News) or emoji animations (Telegram). Also, organize research

Read full story
💬 ONE for All via Chats
Telegram has become the best chat platform that is fully open source with multiple community clients and 800 million active users. Telegram synces across devices and systems instantly, engages group chats effectively with emoji reactions and link previews, and delights everyone with in-window animations and fast media uploads.

Below is the welcoming screen of our @harmony1bot on Telegram. Type command /ask for “Ask Me Anything” with OpenAI ChatGPT-4. Or, simply use “/” or "." or “>” before the prompts. Type command /image for “Make a Photo” with Stable Diffusion XL. Or, use /images for generating multiple images at the same time.

Hello, I'm ONE Bot on Telegram from Harmony – for ALL your AI wishes 🧚‍♀️.

/ask act like elon musk, expand our q4 roadmap "telegram ai bot"
/ask act like mark zuckerberg instead

/image glimpses of a herd of wild elephants crossing a savanna

/more Summarize voice messages, artistic QR code, ChatGPT 32K, DALL-E, Wallet Connect, send tokens, sign transactions...

/help Show this message. Join user group @onebotlove or read docs at harmony.one/bot.

Your credits: 42 ONE tokens. To recharge, send to 0x742c4788CC47A94cf260abc474E2Fa45695a79Cd. 

+-----------------------------------------------------------+
| 💬 /ask ChatGPT4 | 📸 /image Stable Diffusion | 🤩 /more |
+-----------------------------------------------------------+

Top creators for popular images – for Stable Diffusion models on CivitAI
So many AI use cases these days! Let’s catch them all into a single bot, but with streaming payments of a crypto wallet of choice. This leads to, most importantly of all, a bot marketplace for model makers, bot tuners, character trainers, brand creators… It will work for any moment and any desire of your life + work. Think a meeting summary for your voice memo, or answering questions as easily as search. Below is our screen on other commands via typing /more.

/ explain like i am 5, what is a superconductor?
. explain like i have a phd, what is category theory?

/images vintage hot rod with custom flame paint job

/qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful

/connect (Wallet Connect to MetaMask / Gnosis Safe / Timeless)

/send TARGET-WALLET-ADDRESS ONE-TOKEN-AMOUNT
/send 0x742c4788CC47A94cf260abc474E2Fa45695a79Cd 42

/chat32 ("Ask Me Anything” via OpenAI ChatGPT-4 with 32K context)

/memo (Send voice messages via microphone button on bottom right)


❤️‍🔥 Join our team to build AI ∩ Crypto! Product vision:

🧠 Web∞: CivitAI custom models (low-rank adaptations, clothes & accessories, human poses, comics & brand characters, video-to-video transformations), Character.AI celebrity chats, Training from podcast transcripts (strong personality, cult following, deep consistency), RunwayML video clips, HuggingFace embedding ControlNet, Meta segment anything, ElevenLabs speech clones, Zapier task automations, document or website queries. See Launch Schedule.

🌳 Web3: self-custody wallets, token swaps, cross-chain bridges, fiat onramps, lending yields, collectible mints, liquid stakings, price auctions, regional stablecoins, multi-signature safes, governance votes, portfolio management, .1 name services. 

🐝 Web2: news curation, gated access, emoji tipping, collective moments, group discount, social commerce.

🏴‍☠️ Web1: .country domains, email aliases, vanity URLs, Notion hosting, Substack newsletters, site analytics.
More examples of prompts for our ONE Bot @harmony1bot:

/ask rewrite harmony.one/poster like apple press release

/ can you give me a 4-day itinerary to experience the wildlife in the Australian outback?

/ compare shifting business strategies from budget to luxury and luxury to budget, using a brief table to outline different aspects

/ what are some reasons why my linked list would appear empty after I tried reversing it?

/image ancient, mysterious temple in a mountain range, surrounded by misty clouds and tall peaks

/image beautiful waterfall in a lush jungle, with sunlight shining through the trees

/image epic long distance cityscape photo of New York City flooded by the ocean and overgrown buildings and jungle ruins in rainforest, at sunset, cinematic shot, highly detailed, 8k, golden light

/image girl with slightly shocked facial expression, looking out at the many hands holding out phones in front of her (like reporters with microphones), with many social media icons surrounding her, including paper letters with hearts on them, in the style of children's book illustrator, rough crayon brushstrokes, rough-edged 2d animation, fred calleri

/image cracked or broken sculpture art of two people holding hands, mirror polished, stainless steel, heavenly sunset sky, shot from below, in the style of michael benisty

/images birds-eye view, 8k, realistic, *location* for [farm], [racetrack], [las vegas], [beach], [island], [forrest]

/image *in the shape of this logo* for [island], [clear blue ocean water surrounding], [photo taken from above], [global], beautiful and vibrant]

/image (masterpiece, best quality, detailed:1.2), 1girl, adult female, ginger hair, small braids, blue eyes, freckles, smile, red short sleeved flannel shirt, knee-length denim shorts, sitting in a colorful flower field, looking at the sky, birds in the sky, dreamy mood, magical. [negative: child, kid, underage, teen, worst quality, extra digits, watermark, signature:1.2] 
More features coming soon – Join our team to build AI ∩ Crypto! Help pick your fav style, image or model among the top creators at CivitAI here? We will deploly them soon, along with the current models, Stable Diffusion SD “XL” v1.0 for the /image command and Stable Diffusion SD 1.5 “deliberate” v2 for the /qr command making artistic QRCode code.

/ask top numbers in one sentence www.wsj.com/articles/amazon-shines-during-apples-off-season-7f27fc58
🧚 Apple and Amazon have a combined annual revenue of $920 billion, with Amazon posting an operating income of $7.7 billion, and Apple recording a revenue of $81.8 billion.

/ask summarize harmony.one/dear in 10 words
🧚 Harmony is hiring a Tech Lead for their Palo Alto headquarters.

. what language is harmony backend?
🧚 Harmony's backend is written in Go.

. project mission?
Harmony's mission is "to scale trust and create a radically fair economy".

. who to interview?
🧚 The candidates will first have a full-hour interview with Li, Kushagra and Stephen Tse in the office. The next steps are technical interviews with Aaron and Casey.

. casey's role?
🧚 Casey leads in protocol research, network system, and developer community at Harmony.

. team milestones?
🧚 Harmony's next milestones include crypto payments for AI models and products on Telegram, social wallets without separate passwords or devices, and sustainable collectible auctions for .country domains.
💖 ControlNet, LoRA – 1.country QR codes 📸, Brand characters 🧚‍♀️
STEPHEN TSE
·
JUN 25
💖 ControlNet, LoRA – 1.country QR codes 📸, Brand characters 🧚‍♀️
How to make $100k revenue for AI ∩ Crypto today? Which Harmony products will you use twice a day 🪥 and pay $1 each time 🔥? Try our AI Telegram bot 🤖 @HarmonyOneAIBot for brand domains, voice memo summary, wallets, or shared access to Open AI / Stable Diffusion.

Read full story
👛 Per-per-Use Wallets
Now, our 1wallet is an on-device, self-custody wallet on Telegram – much like MetaMask as a Chrome’s browser extension. Join our development discussion and try open prototype?

🤖 Telegram bots & clients: 🛡️ Self-custody wallets & 👨‍👩‍👧‍👦 Multi-signature transactions
STEPHEN TSE
·
JUN 22
🤖 Telegram bots & clients: 🛡️ Self-custody wallets & 👨‍👩‍👧‍👦 Multi-signature transactions
How to use Telegram as your ❤️‍🔥 hot wallet for signing Harmony transactions? Keep your private keys strictly 🛡️ on device – rather than on any bot server or even Telegram itself. How to extend the custody and the approval of Web3 & AI assets and governance to a 👨‍👩‍👧‍👦 social group as simply a multi-people chats?

Read full story
🎏 Radical .country for Bots
Can bots become autonmous and sovereign, owning their wealth and destiny along with humans, as in digital nations? Take over x.country or ai.country now! Let’s grant them tokens and collectibles toward creating sustainable economy and radical fairness.

What do Web2’s OnlyFans and Web3’s friend.tech have in common? Social capital as tokens. OnlyFans made $5.6B revenues by 3.1M Gen Z creators in 2022, while friend.tech made $3.22M fees from $70.1M inflows among 100+ Gen Y influencers in 15 days.

Now – let’s build a sustainable, onchain economy for Web∞’s HuggingFace and CivitAi. We are OnlyBots of Gen AI, on Harmony’s x.country, with generative models, vector embeddings, and low-rank trainings.

So, OnlyBots: Gen (AI) Tokens for Models, Embeds & Trainings. Our Q4 goals are 100 custom Stable Diffusion models, 1000 public and private data sources, and $100K @harmony1bot revenues and tokens with 5 developers or modelers or trainers.

🧚‍♀️ Radically Fair Economy for YOUR 1.country 1️⃣🥇☝️💯
STEPHEN TSE
·
JUL 23
🧚‍♀️ Radically Fair Economy for YOUR 1.country 1️⃣🥇☝️💯
Why creating a (digital) country among your community? Because you can spend time together to create lasting wealth and meaningful moments. How can its economy be radically fair and forever sustainable? Let’s find out with our 1.country initiatives below.

Read full story
🧠 Here’s an interesting quote from a speech given by Steve Jobs on July 15, 1983. What would Jobs think of ChatGPT and artificial intelligence forty years later?

When I was going to school, I had a few great teachers and a lot of mediocre teachers. And the thing that probably kept me out of jail was the books. I could go and read what Aristotle or Plato wrote without an intermediary in the way. And a book was a phenomenal thing. It got right from the source to the destination without anything in the middle.

The problem was, you can’t ask Aristotle a question. And I think, as we look towards the next fifty to one hundred years, if we really can come up with these machines that can capture an underlying spirit, or an underlying set of principles, or an underlying way of looking at the world, then, when the next Aristotle comes around, maybe if he carries around one of these machines with him his whole life—his or her whole life—and types in all this stuff…

... then maybe someday, after this person’s dead and gone, we can ask this machine, “Hey, what would Aristotle have said? What about this?” And maybe we won’t get the right answer, but maybe we will. And that’s really exciting to me. And that’s one of the reasons I’m doing what I’m doing.`
};
