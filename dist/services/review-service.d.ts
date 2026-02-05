export declare function getActiveReviews(limit?: number): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    content: string;
    link: string | null;
    photoUrl: string | null;
    isPinned: boolean;
}[]>;
