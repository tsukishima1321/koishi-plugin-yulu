import { Context, Schema } from 'koishi';
export declare const name = "yulu";
export interface Config {
}
export declare const inject: {
    required: string[];
    optional: string[];
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
export declare function apply(ctx: Context): void;
