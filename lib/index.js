"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const koishi_1 = require("koishi");
const path_1 = require("path");
const url_1 = require("url");
let fs = require("fs");
let request = require("request");
var failedTime = 0;
function getfileByUrl(url, fileName, dir) {
    let stream = fs.createWriteStream((0, path_1.join)(dir, fileName));
    request(url).pipe(stream).on("close", function (err) {
        console.log("语录" + fileName + "下载完毕");
        /*fs.readFile(join(dir, fileName), 'utf8', (err, data) => {
          if (err) {
            failedTime=0;
            console.error(err);
            return;
          }
          if(data=="Internal Server Error"){
            failedTime++
            if(failedTime>10){
              console.log("重试次数已达上限，下载失败")
              return
            }else{
              console.log("while downloading:"+String(url))
              console.log(`Internal Server Error，第${failedTime}次重试`)
              setTimeout(function(){
                getfileByUrl(url,fileName,dir)
                },2000)
            }
          }else{
            failedTime=0;
            console.log("语录" + fileName + "下载成功");
          }
        });*/
    });
}
exports.name = 'yulu';
exports.inject = {
    required: ['database'],
    optional: [],
};
exports.Config = koishi_1.Schema.object({
    adminUsers: koishi_1.Schema.array(koishi_1.Schema.string()).default(['2854196310']),
    dataDir: koishi_1.Schema.string().default("./data/yulu")
}).i18n({
    'zh-CN': require('./locales/zh-CN'),
});
function sendYulu(y, p, t) {
    var res = String(y.id) + ":";
    if (t) {
        res = res + y.tags;
    }
    if (y.content == "img") {
        const href = (0, url_1.pathToFileURL)((0, path_1.join)((0, path_1.resolve)(p), String(y.id))).href;
        res = res + `<img src="${href}">`;
    }
    else {
        res = res + y.content;
    }
    return res;
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
    ctx.command('yulu/yulu_debug')
        .option('on', '-d')
        .option('off', '-o')
        .action(({ options, session }) => {
        if (!cfg.adminUsers.includes(session.event.user.id)) {
            return session.text('.no-permission');
        }
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
    ctx.i18n.define('zh-CN', require('./locales/zh-CN'));
    try {
        if (!fs.existsSync(cfg.dataDir)) {
            fs.mkdirSync(cfg.dataDir);
        }
    }
    catch (err) {
        console.error(err);
        console.error("请检查文件权限");
    }
    ctx.command('yulu/yulu_add [...rest]').alias("添加语录")
        .action(async ({ session }, ...rest) => {
        if (session.quote) {
            const content = session.quote.content;
            const tags = [];
            var group;
            if (session.guildId) {
                tags.push(String(session.guildId));
                group = session.guildId;
            }
            else {
                group = session.userId;
            }
            var exist = await ctx.database.get('yulu', { content: { $eq: content }, }); //搜索是否存在内容相同的语录（涉及到图片时有bug,明明数据库内容完全一致但还是重复，难道是太长了？）
            if (exist.length > 0) {
                session.send(session.text('.already-exist'));
                return sendYulu(exist[0], cfg.dataDir, true);
            }
            exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, }); //根据消息id搜索是否存在相同的语录，即判断该条消息是否已经被添加过
            if (exist.length > 0) {
                session.send(session.text('.already-exist'));
                return sendYulu(exist[0], cfg.dataDir, true);
            }
            for (var i = 0; i < rest.length - 1; i++) { //由于rest会把引用的内容也加入 这里要-1 感觉可能出bug
                tags.push(rest[i]);
            }
            const tag_str = JSON.stringify(tags);
            var result = await ctx.database.create('yulu', { content: content, time: new Date(), origin_message_id: session.quote.id, group: group, tags: tag_str });
            if (session.quote.elements[0].type == "img") { //语录为图片
                if (debugMode) {
                    console.log(String(session.quote.elements[0].attrs.src));
                }
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
    ctx.command('yulu/yulu_tag_add [...rest]').alias("addtag")
        .action(async ({ session }, ...rest) => {
        if (rest.length <= 1) {
            return session.text('.no-tag-to-add');
        }
        else {
            if (session.quote) {
                var exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, });
                if (exist.length > 0) { //如果引用的是语录的原始消息
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
                else { //解析消息获得id来定位语录
                    try {
                        var target = Number(session.quote.content.split(':')[0]);
                    }
                    catch {
                        return session.text('.no-mes-quoted');
                    }
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
                        return session.text('.not-found', [target]);
                    }
                }
            }
            else {
                return session.text('.no-mes-quoted');
            }
        }
    });
    ctx.command('yulu/yulu_tag_remove [...rest]').alias("rmtag")
        .action(async ({ session }, ...rest) => {
        if (rest.length === 0) {
            return session.text('.no-tag-to-remove');
        }
        else {
            if (session.quote) {
                try {
                    var target = Number(session.quote.content.split(':')[0]);
                }
                catch {
                    return session.text('.no-mes-quoted');
                }
                var exist = await ctx.database.get('yulu', { id: target, });
                if (exist.length > 0) {
                    var count = 0;
                    const target = exist[0].id;
                    var tags = JSON.parse(exist[0].tags);
                    tags = tags.filter(tag => {
                        if (rest.includes(tag)) {
                            count++;
                            return false;
                        }
                        return true;
                    });
                    const tag_str = JSON.stringify(tags);
                    ctx.database.set('yulu', target, { tags: tag_str });
                    return session.text('.remove-succeed', [count]);
                }
                else {
                    return session.text('.not-found', [target]);
                }
            }
            else {
                return session.text('.no-mes-quoted');
            }
        }
    });
    ctx.command('yulu/yulu_remove [...rest]').alias("删除语录")
        .action(async ({ session }) => {
        if (session.quote) {
            if (!cfg.adminUsers.includes(session.event.user.id)) {
                return session.text('.no-permission-to-remove');
            }
            else {
                var exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, });
                if (exist.length > 0) { //如果引用的是语录的原始消息
                    ctx.database.remove('yulu', [exist[0].id]);
                    return session.text('.remove-succeed');
                }
                try {
                    var target = Number(session.quote.content.split(':')[0]);
                }
                catch {
                    return session.text('.no-mes-quoted');
                }
                exist = await ctx.database.get('yulu', { id: target, });
                if (exist.length > 0) {
                    ctx.database.remove('yulu', [target]);
                    return session.text('.remove-succeed');
                }
                else {
                    return session.text('.not-found', [target]);
                }
            }
        }
        else {
            return session.text('.no-mes-quoted');
        }
    });
    ctx.command('yulu/yulu_select [...rest]').alias("语录")
        .option('id', '-i <id>')
        .option('global', '-g')
        .option('tag', '-t')
        .option('list', '-l').option('page', '-p <page>').option('full', '-f')
        .shortcut('引用语录', { fuzzy: true, options: { global: true } })
        .action(async ({ session, options }, ...rest) => {
        var finds;
        if (options.id) {
            finds = await ctx.database.get('yulu', options.id);
            if (finds.length == 0) {
                return session.text('.no-result');
            }
            return sendYulu(finds[0], cfg.dataDir, options.tag);
        }
        else {
            var group;
            if (session.guildId) {
                group = session.guildId;
            }
            else {
                group = session.userId;
            }
            var query = ctx.database.select('yulu');
            if (!options.global) {
                query.where({ group: { $eq: group } });
            }
            for (var i = 0; i < rest.length; i++) {
                query.where({ tags: { $regex: rest[i] } });
            }
            finds = await query.execute();
            if (finds.length == 0) {
                return session.text('.no-result');
            }
            if (!options.list) {
                const find = finds[Math.floor(Math.random() * finds.length)];
                const res = sendYulu(find, cfg.dataDir, options.tag);
                return res;
            }
            else {
                var page;
                if (!options.page) {
                    page = 1;
                }
                else {
                    page = options.page;
                }
                var res = "";
                var i = 0;
                for (i = page * 10 - 10; (i < page * 10 || options.full) && i < finds.length; i++) {
                    const y = finds[i];
                    res += String(y.id) + ":" + y.tags + "\n";
                }
                if (i < finds.length) {
                    res += session.text('.rest', [finds.length - i]);
                }
                return res;
            }
        }
    });
    ctx.command('yulu/yulu_test <id:number>')
        .action(async ({ session }, id) => {
    });
    ctx.middleware(async (session, next) => {
        if (debugMode) {
            console.log(session.event);
            console.log(session.elements);
            session.send("event:\n" + JSON.stringify(session.event));
            if (session.quote) {
                session.send("quote:\n" + JSON.stringify(session.quote));
                console.log(session.quote);
                console.log(session.quote.elements);
            }
            return next();
        }
        else {
            return next();
        }
    });
}
exports.apply = apply;
