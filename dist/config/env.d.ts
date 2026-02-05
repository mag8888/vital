import 'dotenv/config';
export declare const env: {
    botToken: string;
    botUsername: string;
    botWebhookUrl: string | undefined;
    botWebhookSecret: string | undefined;
    adminChatId: string | undefined;
    databaseUrl: string | undefined;
    adminEmail: string;
    adminPassword: string;
    publicBaseUrl: string;
    webappUrl: string;
    webappBaseUrl: string;
    videoUrl: string;
    plazmaApiKey: string;
    plazmaApiUrl: string;
    /** Папка в Cloudinary с аудио для «Звуковые матрицы» (если в БД нет записей) */
    cloudinaryAudioFolder: string;
};
export declare function getAdminChatIds(): string[];
export declare function sendToAllAdmins(bot: any, message: string): Promise<void>;
