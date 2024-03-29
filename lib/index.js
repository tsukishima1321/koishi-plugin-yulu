"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.inject = exports.name = void 0;
const koishi_1 = require("koishi");
const path_1 = require("path");
const url_1 = require("url");
let fs = require("fs");
let request = require("request");
async function getfileByUrl(url, fileName, dir) {
    return new Promise((resolve, reject) => {
        let stream = fs.createWriteStream((0, path_1.join)(dir, fileName));
        request(url).pipe(stream).on("close", (err) => {
            if (err) {
                console.error(err);
                reject(err);
            }
            else {
                console.log("语录" + fileName + "下载完毕");
                resolve(true);
            }
        });
    });
}
exports.name = 'yulu';
exports.inject = {
    required: ['database'],
    optional: [],
};
exports.Config = koishi_1.Schema.object({
    adminUsers: koishi_1.Schema.array(koishi_1.Schema.string()).default(['2854196310']),
    dataDir: koishi_1.Schema.string().default("./data/yulu"),
    pageSize: koishi_1.Schema.number().default(10)
}).i18n({
    'zh-CN': require('./locales/zh-CN'),
});
function sendYulu(y, p, t) {
    var res = String(y.id) + ":";
    if (t) {
        res = res + y.tags;
    }
    if (y.content.slice(0, 4) == "http" || y.content == "img") {
        const href = (0, url_1.pathToFileURL)((0, path_1.join)((0, path_1.resolve)(p), String(y.id))).href;
        res = res + `<img src="${href}">`;
    }
    else {
        res = res + y.content;
    }
    return res;
}
function getRandomElements(arr, count) {
    const randomIndexes = new Set();
    if (arr.length <= count) {
        return arr;
    }
    while (randomIndexes.size < count) {
        const randomIndex = Math.floor(Math.random() * arr.length);
        randomIndexes.add(randomIndex);
    }
    return Array.from(randomIndexes).map((index) => arr[index]);
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
    var pageSize = cfg.pageSize;
    var listeningQueue = [];
    try {
        if (!fs.existsSync(cfg.dataDir)) {
            fs.mkdirSync(cfg.dataDir);
        }
    }
    catch (err) {
        console.error(err);
        console.error("请检查文件权限");
    }
    function rmErrYulu(id, session) {
        session.send(session.text('.download-failed', [id]));
        session.execute(`yulu_select -i ${id} -l`);
        console.warn(`语录${id}文件异常，从数据库移除`);
        setTimeout(() => {
            ctx.database.remove('yulu', [id]);
            session.send(session.text('.delete-finish', [id]));
        }, 1000);
    }
    async function checkFile(id) {
        return new Promise((resolve, reject) => {
            fs.stat((0, path_1.join)(cfg.dataDir, String(id)), (err, stats) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                else {
                    if (stats.size < 100) {
                        resolve(false);
                    }
                    else {
                        resolve(true);
                    }
                }
            });
        });
    }
    var yuluRemove = ctx.command('yulu/yulu_remove [...rest]').alias("删除语录")
        .option('id', '-i <id:number>')
        .action(async ({ session, options }) => {
        if (options.id) {
            if (!cfg.adminUsers.includes(session.event.user.id)) {
                return session.text('.no-permission-to-remove');
            }
            else {
                const finds = await ctx.database.get('yulu', options.id);
                if (finds.length == 0) {
                    return session.text('.no-result');
                }
                ctx.database.remove('yulu', [options.id]);
                return session.text('.remove-succeed');
            }
        }
        else {
            if (session.quote || session.elements[0].type == "quote") {
                if (!cfg.adminUsers.includes(session.event.user.id)) {
                    return session.text('.no-permission-to-remove');
                }
                else {
                    var exist;
                    try {
                        var target = Number(session.event.message.elements[0].children[1].attrs.content.split(':')[0]);
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
        }
    });
    var yuluAdd = ctx.command('yulu/yulu_add [...rest]').alias("添加语录")
        .action(async ({ session }, ...rest) => {
        const tags = [];
        var group;
        if (session.guildId) {
            group = session.guildId;
        }
        else {
            group = session.userId;
        }
        tags.push(group);
        for (var i = 0; i < rest.length; i++) {
            tags.push(rest[i]);
        }
        const tag_str = JSON.stringify(tags);
        var result = await ctx.database.create('yulu', { content: "pending", time: new Date(), origin_message_id: session.event.message.id, group: group, tags: tag_str });
        listeningQueue.push({ id: result.id, group: group, user: session.event.user.id });
        return session.text('.wait-pic');
    });
    var yuluTagAdd = ctx.command('yulu/yulu_tag_add [...rest]').alias("addtag")
        .action(async ({ session }, ...rest) => {
        if (rest.length < 1) {
            return session.text('.no-tag-to-add');
        }
        else {
            if (session.quote || session.elements[0].type == "quote") {
                try {
                    var target = Number(session.event.message.elements[0].children[1].attrs.content.split(':')[0]);
                }
                catch {
                    return session.text('.no-mes-quoted');
                }
                var exist = await ctx.database.get('yulu', { id: target, });
                if (exist.length > 0) {
                    var count = 0;
                    const target = exist[0].id;
                    var tags = JSON.parse(exist[0].tags);
                    for (var i = 0; i < rest.length; i++) {
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
            else {
                return session.text('.no-mes-quoted');
            }
        }
    });
    var yuluTagRemove = ctx.command('yulu/yulu_tag_remove [...rest]').alias("rmtag")
        .action(async ({ session }, ...rest) => {
        if (rest.length === 0) {
            return session.text('.no-tag-to-remove');
        }
        else {
            if (session.quote || session.elements[0].type == "quote") {
                try {
                    var target = Number(session.event.message.elements[0].children[1].attrs.content.split(':')[0]);
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
    ctx.command('yulu/yulu_select [...rest]').alias("语录")
        .option('id', '-i <id:number>')
        .option('global', '-g')
        .option('tag', '-t')
        .option('list', '-l').option('page', '-p <page:number>').option('full', '-f')
        .shortcut('引用语录', { fuzzy: true, options: { global: true } })
        .action(async ({ session, options }, ...rest) => {
        var finds;
        if (options.id) {
            finds = await ctx.database.get('yulu', options.id);
            if (finds.length == 0) {
                return session.text('.no-result');
            }
            const y = finds[0];
            if (options.list) {
                var res = String(y.id) + ":" + y.tags + "\n";
                return res;
            }
            else {
                if (!await checkFile(options.id)) { //语录文件下载失败
                    rmErrYulu(options.id, session);
                    return;
                }
                return sendYulu(y, cfg.dataDir, options.tag);
            }
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
                if (!await checkFile(find.id)) { //语录文件下载失败
                    rmErrYulu(find.id, session);
                    return;
                }
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
                for (i = page * pageSize - pageSize; (i < page * pageSize || options.full) && i < finds.length; i++) {
                    const y = finds[i];
                    res += String(y.id) + ":" + y.tags + "\n";
                }
                if (i < finds.length) {
                    res += session.text('.rest', [page, Math.ceil(finds.length / pageSize)]);
                }
                return res;
            }
        }
    });
    ctx.middleware(async (session, next) => {
        if (session.elements[0].type == "quote") {
            session.execute(session.content.slice(session.content.lastIndexOf('>') + 1));
            console.log(session.content.slice(session.content.lastIndexOf('>') + 1));
        }
        if (listeningQueue.length > 0) {
            for (var i = 0; i < listeningQueue.length; i++) {
                if ((!session.guildId || session.guildId == listeningQueue[i].group) && session.event.user.id == listeningQueue[i].user && session.event.message.elements[0].type == "img") {
                    const src = session.event.message.elements[0].attrs.src;
                    await getfileByUrl(src, String(listeningQueue[i].id), cfg.dataDir); //下载图片到本地路径
                    if (!await checkFile(listeningQueue[i].id)) { //语录文件下载失败
                        console.warn(`语录${src}下载失败`);
                        async function retry(ms) {
                            return new Promise((resolve, reject) => {
                                setTimeout(async () => {
                                    await getfileByUrl(src, String(listeningQueue[i].id), cfg.dataDir);
                                    resolve(await checkFile(listeningQueue[i].id));
                                }, ms);
                            });
                        }
                        var flag = false;
                        for (var i = 0; i < 10; i++) {
                            console.log(`下载失败，第${i + 1}次重试`);
                            if (await retry(2000)) {
                                flag = true;
                                console.log(`下载成功`);
                                break;
                            }
                        }
                        if (!flag) {
                            console.log(`重试次数达上限`);
                            rmErrYulu(listeningQueue[i].id, session);
                            return;
                        }
                    }
                    //await ctx.database.set('yulu', listeningQueue[i].id, { content: "img" })//替换数据库中的内容为图片标识，发送时根据id查找图片文件*/
                    await ctx.database.set('yulu', listeningQueue[i].id, { content: src });
                    session.send(`语录${listeningQueue[i].id}添加成功`);
                    listeningQueue[i].id = -1;
                }
            }
            listeningQueue = listeningQueue.filter((item) => { item.id != -1; });
        }
        if (debugMode) {
            try {
                console.log(JSON.stringify(session.event, null, "  "));
                //session.send("event:\n" + JSON.stringify(session.event))
                return next();
            }
            catch (error) {
                return next();
            }
        }
        else {
            return next();
        }
    });
}
exports.apply = apply;
