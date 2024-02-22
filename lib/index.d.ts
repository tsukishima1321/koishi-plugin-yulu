import { Context, Schema } from 'koishi';
export declare const name = "yulu";
export interface Config {
    dataDir: string;
    adminUsers: {
        uid: string;
        note?: string;
    }[];
}
export declare const inject: {
    required: string[];
    optional: any[];
};
export declare const Config: Schema<Config>;
declare module 'koishi' {
    interface Tables {
        yulu: Yulu;
    }
}
export interface Yulu {
    id: number;
    content: string;
    time: Date;
    origin_message_id: string;
    tags: string;
    group: string;
}
export declare function apply(ctx: Context, cfg: Config): void;
