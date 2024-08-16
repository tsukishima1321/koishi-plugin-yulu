import { Context, Schema } from 'koishi';
export declare const name = "yulu";
export interface Config {
    dataDir: string;
    adminUsers: string[];
    pageSize: number;
    lessRepetition: number;
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
declare module '@koishijs/cache' {
    interface Tables {
        [key: `yulu_recent_send_${string}`]: boolean;
    }
}
export declare function apply(ctx: Context, cfg: Config): void;
