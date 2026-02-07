
import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb://mongo:pJzMMKYOvHUptbOTkFgwiwLOqYVnRqUp@nozomi.proxy.rlwy.net:28672';

async function analyze() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('Connected to Mongo');

    const usersBot = await client.db('plazma_bot').collection('User').find({}).toArray();
    const usersPlazma = await client.db('plazma').collection('users').find({}).toArray();

    const botIds = new Set(usersBot.map(u => String(u.telegramId || '')));
    const plazmaIds = new Set(usersPlazma.map(u => String(u.telegramId || '')));

    botIds.delete('undefined');
    plazmaIds.delete('undefined');
    botIds.delete('null');
    plazmaIds.delete('null');
    botIds.delete('');
    plazmaIds.delete('');

    const union = new Set([...botIds, ...plazmaIds]);
    console.log(`Union (Total Unique Users from User collections): ${union.size}`);

    // Check userHistories for more unique IDs with Hex decoding
    console.log('\n--- Checking userHistories (Hex decoding) ---');
    // Fetch only userId
    const history = await client.db('plazma').collection('userHistories').find({}, { projection: { userId: 1 } }).toArray();
    console.log(`History records found: ${history.length}`);

    const historyIds = new Set();
    let debugCount = 0;

    for (const h of history) {
        if (h.userId) {
            try {
                let hex = String(h.userId);
                // Remove leading zeros
                hex = hex.replace(/^0+/, '');
                if (hex && hex !== 'undefined' && hex !== 'null') {
                    const decimalId = BigInt('0x' + hex).toString();
                    if (decimalId) {
                        historyIds.add(decimalId);
                        if (debugCount < 5) {
                            console.log(`Decoded: ${h.userId} -> ${hex} -> ${decimalId}`);
                            debugCount++;
                        }
                    }
                }
            } catch (e) {
                if (debugCount < 5) console.log(`Error decoding ${h.userId}: ${e.message}`);
            }
        }
    }

    console.log(`Unique Decoded IDs in userHistories: ${historyIds.size}`);

    const unionWithHistory = new Set([...union, ...historyIds]);
    console.log(`Union of Users + History: ${unionWithHistory.size}`);

    const inHistoryOnly = new Set([...historyIds].filter(x => !union.has(x)));
    console.log(`IDs in History but NOT in User/users collections: ${inHistoryOnly.size}`);

    if (inHistoryOnly.size > 0) {
        console.log('Sample IDs found only in History:', [...inHistoryOnly].slice(0, 5));
    }

    await client.close();
}

analyze().catch(console.error);
