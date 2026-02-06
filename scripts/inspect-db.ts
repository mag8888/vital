
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

        const targetDbs = ['test', 'plazma', 'plazma_bot'];

        for (const dbName of targetDbs) {
            console.log(`\n\n=== Database: ${dbName} ===`);
            try {
                const targetDb = client.db(dbName);
                // Check Product or Category
                const count = await targetDb.collection('Product').countDocuments();
                console.log(`Product collection count: ${count}`);

                const countLower = await targetDb.collection('products').countDocuments();
                console.log(`products (lowercase) collection count: ${countLower}`);

                if (dbName === 'plazma_bot') {
                    const colName = 'Product';
                    console.log(`\nInspecting ${colName} in ${dbName}...`);
                    const items = await targetDb.collection(colName).find({}).toArray();

                    items.forEach(item => {
                        console.log(`\nProduct: ${item.title}`);
                        console.log(`  Price: ${item.price}`);
                        console.log(`  Image: ${item.imageUrl}`);
                    });
                }
            } catch (e: any) {
                console.log(`Error inspecting ${dbName}: ${e.message}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

inspect();
