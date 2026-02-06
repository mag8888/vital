
import { MongoClient } from 'mongodb';

const url = 'mongodb://mongo:pJzMMKYOvHUptbOTkFgwiwLOqYVnRqUp@nozomi.proxy.rlwy.net:28672/plazma_bot?authSource=admin';

async function inspect() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log('Connected correctly to server');
        const admin = client.db('admin').admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name));

        const targetDbs = ['plazma', 'plazma_bot'];

        for (const dbName of targetDbs) {
            console.log(`\n\n=== Database: ${dbName} ===`);
            const targetDb = client.db(dbName);
            const collections = await targetDb.listCollections().toArray();

            // Checks for Audio collections
            console.log(`\n-- Audio Check --`);
            if (dbName === 'plazma') {
                const count = await targetDb.collection('AudioFile').countDocuments();
                const countLower = await targetDb.collection('audioFiles').countDocuments();
                console.log(`AudioFile: ${count}`);
                console.log(`audioFiles: ${countLower}`);
            }
            if (dbName === 'plazma_bot') {
                const count = await targetDb.collection('AudioFile').countDocuments();
                const countLower = await targetDb.collection('audioFiles').countDocuments();
                console.log(`AudioFile: ${count}`);
                console.log(`audioFiles: ${countLower}`);

                // Inspect content
                if (count > 0) {
                    const items = await targetDb.collection('AudioFile').find({}).limit(3).toArray();
                    console.log('Sample AudioFile:', items.map(i => ({ t: i.title, cat: i.category, act: i.isActive })));
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

inspect();
