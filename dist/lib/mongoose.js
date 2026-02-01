import mongoose from 'mongoose';
// Railway provides MONGO_URL for MongoDB plugin, but we also support DATABASE_URL
const dbUrl = process.env.DATABASE_URL || process.env.MONGO_URL;
if (!dbUrl) {
    console.error('❌ DATABASE_URL or MONGO_URL not found in environment variables');
    console.error('💡 To use Railway MongoDB, set DATABASE_URL=${{MongoDB.MONGO_URL}}');
}
// Fix MongoDB connection string for Railway compatibility
let fixedDbUrl = undefined;
if (dbUrl) {
    try {
        let url = dbUrl.trim();
        // Для mongodb:// проверяем и исправляем формат
        if (url.startsWith('mongodb://') && !url.includes('mongodb+srv://')) {
            try {
                const urlObj = new URL(url);
                // Если нет pathname (имени базы данных), добавляем по умолчанию
                if (!urlObj.pathname || urlObj.pathname === '/') {
                    const defaultDb = process.env.MONGODB_DB_NAME || 'plazma_bot';
                    urlObj.pathname = `/${defaultDb}`;
                    url = urlObj.toString();
                    console.log(`✅ Added default database name: ${defaultDb}`);
                }
                // Для Railway MongoDB добавляем authSource=admin если его нет
                if (!urlObj.searchParams.has('authSource')) {
                    urlObj.searchParams.set('authSource', 'admin');
                    url = urlObj.toString();
                    console.log('✅ Added authSource=admin for Railway MongoDB');
                }
            }
            catch (urlError) {
                // Если URL парсер не смог распарсить, пробуем простую проверку
                if (!url.includes('/') || url.match(/^mongodb:\/\/[^/]+$/)) {
                    const defaultDb = process.env.MONGODB_DB_NAME || 'plazma_bot';
                    if (url.includes('?')) {
                        url = url.replace('?', `/${defaultDb}?`);
                    }
                    else {
                        url = `${url}/${defaultDb}`;
                    }
                    console.log(`✅ Added default database name (fallback): ${defaultDb}`);
                }
            }
        }
        fixedDbUrl = url;
    }
    catch (error) {
        console.error('Error processing database URL:', error);
        fixedDbUrl = dbUrl;
    }
}
if (fixedDbUrl) {
    console.log('Database URL configured:', fixedDbUrl.substring(0, 30) + '...');
    // Проверяем, используется ли Railway MongoDB
    if (fixedDbUrl.includes('${{') || fixedDbUrl.includes('mongodb://mongo')) {
        console.log('✅ Railway MongoDB detected');
    }
    else if (fixedDbUrl.includes('mongodb+srv://') && fixedDbUrl.includes('mongodb.net')) {
        console.log('✅ MongoDB Atlas detected');
    }
}
// Mongoose connection options
const mongooseOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0,
};
let isConnected = false;
export async function connectMongoose() {
    if (isConnected) {
        console.log('✅ Mongoose already connected');
        return;
    }
    if (!fixedDbUrl) {
        throw new Error('DATABASE_URL or MONGO_URL not configured');
    }
    try {
        await mongoose.connect(fixedDbUrl, mongooseOptions);
        isConnected = true;
        console.log('✅ Mongoose connected to MongoDB');
    }
    catch (error) {
        console.error('❌ Mongoose connection error:', error.message);
        throw error;
    }
}
export async function disconnectMongoose() {
    if (!isConnected) {
        return;
    }
    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('✅ Mongoose disconnected');
    }
    catch (error) {
        console.error('❌ Mongoose disconnection error:', error.message);
    }
}
// Handle connection events
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connection established');
});
mongoose.connection.on('error', (error) => {
    console.error('❌ Mongoose connection error:', error);
});
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  Mongoose disconnected');
    isConnected = false;
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await disconnectMongoose();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnectMongoose();
    process.exit(0);
});
export default mongoose;
