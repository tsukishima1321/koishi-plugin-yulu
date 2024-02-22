"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const koishi_1 = require("koishi");
const path_1 = require("path");
const url_1 = require("url");
let fs = require("fs");
let path = require("path");
let request = require("request");
function getfileByUrl(url, fileName, dir) {
    let stream = fs.createWriteStream(path.join(dir, fileName));
    request(url).pipe(stream).on("close", function (err) {
        console.log("语录" + fileName + "下载完毕");
    });
}
exports.name = 'yulu';
exports.inject = {
    required: ['database'],
    optional: [],
};
exports.Config = koishi_1.Schema.object({
    adminUsers: koishi_1.Schema.array(koishi_1.Schema.object({
        uid: koishi_1.Schema.string().required(),
        note: koishi_1.Schema.string()
    })).default([{ uid: 'red:2854196310', note: '' }]),
    dataDir: koishi_1.Schema.string().default("./data/yulu")
}).i18n({
    'zh-CN': require('./locales/zh-CN'),
});
function sendYulu(y, p) {
    if (y.content == "img") {
        const href = (0, url_1.pathToFileURL)((0, path_1.join)((0, path_1.resolve)(p), String(y.id))).href;
        return String(y.id) + ":" + `<img src="${href}">`;
    }
    else {
        return String(y.id) + ":" + y.content;
    }
}
function apply(ctx, cfg) {
    ctx.model.extend('yulu', {
        id: 'unsigned',
        content: 'string',
        time: 'timestamp',
        origin_message_id: 'string',
        tags: 'text',
        group: 'string'
    }, { autoInc: true });
    var debugMode = false;
    ctx.i18n.define('zh-CN', require('./locales/zh-CN'));
    ctx.command('debug')
        .option('on', '-d')
        .option('off', '-o')
        .action(({ options, session }) => {
        if (options.on == true) {
            debugMode = true;
            return session.text('.debug-on');
        }
        if (options.off == true) {
            debugMode = false;
            return session.text('.debug-off');
        }
        return session.text('.debug-status', [debugMode]);
    });
    ctx.command('yulu_add [...rest]').alias("添加语录")
        .action(async ({ session }, ...rest) => {
        if (session.quote) {
            const content = session.quote.content;
            const tags = [];
            if (session.guildId) {
                tags.push(String(session.guildId));
            }
            var exist = await ctx.database.get('yulu', { content: { $eq: content }, }); //搜索是否存在内容相同的语录（涉及到图片时有bug,明明数据库内容完全一致但还是重复，难道是太长了？）
            const group = session.guildId;
            if (exist.length > 0) {
                session.send(session.text('.already-exist'));
                return sendYulu(exist[0], cfg.dataDir);
            }
            exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, }); //根据消息id搜索是否存在相同的语录，即判断该条消息是否已经被添加过
            if (exist.length > 0) {
                session.send(session.text('.already-exist'));
                return sendYulu(exist[0], cfg.dataDir);
            }
            for (var i = 0; i < rest.length - 1; i++) { //由于rest会把引用的内容也加入 这里要-1 感觉可能出bug
                tags.push(rest[i]);
            }
            const tag_str = JSON.stringify(tags);
            var result = await ctx.database.create('yulu', { content: content, time: new Date(), origin_message_id: session.quote.id, group: group, tags: tag_str });
            if (session.quote.elements[0].type == "img") { //语录为图片
                getfileByUrl(session.quote.elements[0].attrs.src, String(result.id), cfg.dataDir); //下载图片到本地路径
                const local = (0, url_1.pathToFileURL)((0, path_1.join)((0, path_1.resolve)(cfg.dataDir), String(result.id)));
                await ctx.database.set('yulu', result.id, { content: "img" }); //替换数据库中的内容为图片标识，发送时根据id查找图片文件
            }
            return session.text('.add-succeed');
        }
        else {
            return session.text('.no-mes-quoted');
        }
    });
    ctx.command('yulu_tag_add [...rest]').alias("addtag")
        .action(async ({ session }, ...rest) => {
        if (rest.length <= 1) {
            return session.text('.no-tag-to-add');
        }
        else {
            if (session.quote) {
                var exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, });
                if (exist.length > 0) {
                    var count = 0;
                    const target = exist[0].id;
                    var tags = JSON.parse(exist[0].tags);
                    for (var i = 0; i < rest.length - 1; i++) {
                        if (!tags.includes(rest[i])) {
                            tags.push(rest[i]);
                            count++;
                        }
                    }
                    const tag_str = JSON.stringify(tags);
                    ctx.database.set('yulu', target, { tags: tag_str });
                    return session.text('.add-succeed', [count]);
                }
                else {
                    var target = Number(session.quote.content.split(':')[0]);
                    exist = await ctx.database.get('yulu', { id: target, });
                    if (exist.length > 0) {
                        var count = 0;
                        const target = exist[0].id;
                        var tags = JSON.parse(exist[0].tags);
                        for (var i = 0; i < rest.length - 1; i++) {
                            if (!tags.includes(rest[i])) {
                                tags.push(rest[i]);
                                count++;
                            }
                        }
                        const tag_str = JSON.stringify(tags);
                        ctx.database.set('yulu', target, { tags: tag_str });
                        return session.text('.add-succeed', [count]);
                    }
                    else {
                        return session.text('.not-found');
                    }
                }
            }
            else {
                return session.text('.no-mes-quoted');
            }
        }
    });
    ctx.command('yulu_tag_removeg [...rest]').alias("rmtag")
        .action(({ session }, ...rest) => {
        if (rest.length === 0) {
            return session.text('.no-tag-to-remove');
        }
        else {
        }
    });
    ctx.command('yulu_remove [...rest]').alias("删除语录")
        .action(({ session }, ...rest) => {
        if (session.quote && session.quote.elements[0].type == "img") {
            if (0) { /*发送者没有权限*/
                return session.text('.no-permission-to-remove');
            }
            else {
            }
        }
        else {
            return session.text('.no-mes-quoted');
        }
    });
    ctx.command('yulu_select [...rest]').alias("语录")
        .option('id', '-i')
        .option('global', '-g')
        .option('tag', '-t')
        .shortcut('引用语录', { fuzzy: true, options: { global: true } })
        .action(async ({ session, options }, ...rest) => {
        if (options.id) {
            const target = rest[0];
            finds = await ctx.database.get('yulu', target);
            if (finds.length == 0) {
                return session.text('.no-result');
            }
            return sendYulu(finds[0], cfg.dataDir);
        }
        else {
            const group = session.guildId;
            var finds;
            if (rest.length == 0) {
                if (options.global) {
                    finds = await ctx.database.get('yulu', {});
                }
                else {
                    finds = await ctx.database.get('yulu', { group: { $eq: group } });
                }
            }
            else {
                if (options.global) {
                    finds = await ctx.database.get('yulu', { tags: { $regexFor: "/" + rest[0] + "/" } });
                }
                else {
                    finds = await ctx.database.get('yulu', { tags: { $regexFor: "/" + rest[0] + "/" }, group: { $eq: group } });
                }
            }
            if (finds.length == 0) {
                return session.text('.no-result');
            }
            const find = finds[Math.floor(Math.random() * finds.length)];
            return sendYulu(find, cfg.dataDir);
        }
    });
    ctx.middleware(async (session, next) => {
        if (debugMode && (session.event.user.id == "3783232893" || session.event.user.id == "2479568395")) {
            console.log(session.event);
            console.log(session.elements);
            return next();
        }
        else {
            return next();
        }
    });
}
exports.apply = apply;
