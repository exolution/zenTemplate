/**
 * Javascript Powered!
 * @author: godsong
 * Date: 13-4-28
 * Time: 下午2:12
 */

var zenTemplate = function (window, undefined) {
    //分词状态
    var WordType = {
        TAG_NAME: 1, /*标签名（初始状态）*/
        CLASS_NAME: 2, /*CSS类名*/
        ID: 3, /*ID*/
        ATTR: 4, /*属性开始*/
        END_ATTR: 5, /*属性结束*/
        VALUE: 7, /*值（文本）节点开始*/
        COMPLETE: 8/*完成（实际指括号结束）*/
    };
    try{
        console.log('zenTemplate v0.5!');
    }catch(e){
        console={log:function(){}};
    }
    //判断是否是不用关闭的标签
    var nv = "area|base|basefont|bgsound|br|col|frame|hr|img|input|isindex|link|meta|param|embed|wbr".split('|');
    var noclose = {};
    for (var i = 0; i < nv.length; i++) {
        noclose[nv[i]] = 1;
    }
    nv = null;
    var replaceCallBack,
        replaceRegexp,
        handlers={};

    //解析中的标签信息 包含以下信息
    // type标签类型【tag普通标签,textNode文本节点】
    // tagName标签名
    // class类名列表(字符串，尾部多一个空格)
    // id
    // prop属性列表[{key:'',value:''},...]
    // textContent文本节点的文本值
    //isClosed 标签是否已闭合 未闭合说明后续嵌套的有其他标签
    //iterNum迭代次数
    //tier层级 标签的嵌套级别 最外层为0 依次增加
    var tag,
        tagStack,//解析过程中生成的标签栈
        idx,//解析位置索引
        wordType,//当前分词状态
        word ,//解析出的单词
        iterNum ,
        textMode,
        iterMode,
        tier,//嵌套层级
        tierStack,//嵌套层级栈
        code;//目标zenCoding代码


    function pushHandler(name,func){
        if(handlers[name]==undefined){
            handlers[name]=[func];
        }
        else {
            handlers[name].unshift(func);
        }
    }
    function appendHandler(name,func){
        if(handlers[name]==undefined){
            handlers[name]=[func];
        }
        else {
            handlers[name].push(func);
        }
    }
    function setHandler(name,func){
        handlers[name]=[func];
    }
    function removeHandler(name,func){
        var idx;
        if(handlers[name]){
            idx=handlers[name].indexOf(func);
            if(idx!=-1){
                handlers[name].splice(idx,1);
                return true;
            }
            else return false;
        }
        else {
            return false;
        }
    }
    function handle(name){
        var len,ret;
       if(handlers[name]&&(len=handlers[name].length)>0){
        for(var i=0;i<len;i++){
            ret=handlers[name][i].apply(handlers[name],Array.prototype.slice.call(arguments,1).concat(ret));
        }

       }
        return ret;
    }



    //重复（增生）一个标签的HTML 并进行模版变量的替换 替换规则(正则表达式)和替换逻辑(替换回调)可由用户指定。
    function repeatTag(html, n) {
        var buffer = '', i;
        replaceRegexp= replaceRegexp|| /%([0-9]+|[a-zA-Z])%/g;
        if (n == 0 || isNaN(n))return html;
        var repfunc = function (a, b, idx, m) {
            return (replaceCallBack && replaceCallBack.call(m, b, idx + 1)) || isNaN(+b) ? String.fromCharCode(b.charCodeAt(0) + i) : String(+b + i);
        };
        for (i = 0; i < n; i++) {
            buffer += html.replace(replaceRegexp, repfunc);
        }
        repfunc = null;
        return buffer;
    }


    //标签类 用于存放解析过程中的标签信息 以及包含一个生成HTML的成员工具函数
    function Tag(type) {
        this.type = type || 'tag';
        this.className = "";
        this.props = [];
    }

    Tag.prototype = {
        constructor: Tag,
        //生成标签的HTML，并自动增生
        // 可以指定一个关联的HTML，如果标签是闭合的该关联HTML则加到该标签的HTML左边或者右边（由joinLeft指定是左[true]还是右[false]）
        //若标签是未闭合的
        toHTML: function (involvedHTML, joinLeft) {
            var html = '',
                leftHTML = '',
                rightHTML = '';
            if (joinLeft) {
                leftHTML = involvedHTML;
            }
            else {
                rightHTML = involvedHTML;
            }
            if (this.type == 'textNode') {
                return leftHTML+(handle('tagHtmlRim',this,1)||'')+repeatTag(this.textContent, +this.iterNum)+(handle('tagHtmlRim',this,-2)||'')+rightHTML;
            }
            else {
                html =(handle('tagHtmlRim',this,1)||'')+ '<' + this.tagName;
                if (this.id != undefined) {
                    html += ' id="' + this.id + '"';
                }
                if (this.className) {
                    html += ' class="' + this.className.substr(0, this.className.length - 1) + '"';
                }
                if (this.props.length > 0) {
                    for (var i=0;i<this.props.length;i++) {
                        html += ' ' + this.props[i].key + '="' + this.props[i].value + '"';
                    }
                }
                html=handle('tagHtmlInner',this,html)||html;
                if (this.isClosed) {
                    html += '>';
                    if(noclose[this.tagName]!==1){
                       html+=(handle('tagHtmlRim',this,2)||'')+(handle('tagHtmlRim',this,-1)||'')+'</' + this.tagName + '>';
                    }
                    html+=(handle('tagHtmlRim',this,-2)||'');
                    return leftHTML + repeatTag(html, this.iterNum) + rightHTML;
                } else {
                    html += '>'+(handle('tagHtmlRim',this,2)||'') + involvedHTML +(handle('tagHtmlRim',this,-1)||'')+'</' + this.tagName + '>'+(handle('tagHtmlRim',this,-2)||'');
                    return repeatTag(html, this.iterNum);
                }
            }
        }
    };

    //完成前一个标签的属性或者成分
    function completePrevAttribute() {
        switch (wordType) {
            case WordType.TAG_NAME:
                tag.tagName = word;
                break;
            case WordType.ID:
                tag.id = word;
                break;
            case WordType.CLASS_NAME:
                tag.className += word + ' ';
                break;
            case WordType.VALUE:
                tag.textContent = word;
                break;
        }
        tag.tier=tier;
    }

    //完成前一个标签 并入栈 一般在关联词处调用 如> + 和)
    function completePrevTag(closed, iterNum) {
        if (wordType == WordType.COMPLETE) {
            if (+iterNum > 0) {
                tagStack[tagStack.length - 1] += '*' + iterNum;
            }
        }
        else {
            completePrevAttribute();
            tag.isClosed = closed;
            tag.iterNum = +iterNum;
            tagStack.push(tag);
            tag = new Tag();
        }
    }

    /**
     * 解析zencoding代码返回HTML代码
     * */
    var parse = function (htmlCode) {

        var ch='',
            propKey='',
            propVal='',
            notInAllSection,//标示当前字符没有出现在所有的特殊文本区域
            notInAttrSection,//标示当前的字符没有出现在普通文本(\转义)和属性文本区中
            notInValueSection;//表示当前的字符没有出现在普通义文本和文本节点区中
        //初始化区
        tag = new Tag();
        tagStack = [];
        tierStack=[];
        word = '';
        idx = 0;
        tier=0;
        textMode = false;
        iterMode = false;
        //增生次数
        iterNum = '';
        wordType = WordType.TAG_NAME;
        if (htmlCode.length == 0)return '';
        code = htmlCode;


        //分词分析主循环 开始
        while (idx < code.length) {

            ch = code.charAt(idx);
            notInAllSection=!textMode&&wordType!==WordType.ATTR&&wordType!==WordType.VALUE;
            notInAttrSection=!textMode&&wordType!=WordType.ATTR;
            notInValueSection=!textMode&&wordType!=WordType.VALUE;

            if (ch === '.' && notInAllSection) {
                completePrevAttribute();
                word = '';
                wordType = WordType.CLASS_NAME;
            }
            else if (ch === '#' && notInAllSection) {
                completePrevAttribute();
                word = '';
                wordType = WordType.ID;
            }
            else if (ch === '>' &&notInAttrSection) {

                if(wordType==WordType.VALUE||noclose[tag.tagName]==1){
                    completePrevTag(true, iterNum);
                }
                else{

                    completePrevTag(false, iterNum);
                    tier++;
                }
                iterNum = '';
                word = '';
                iterMode = false;
                wordType = WordType.TAG_NAME;
            }
            else if (ch === '+' && notInAttrSection) {
                completePrevTag(true, iterNum);
                word = '';
                iterNum = '';
                iterMode = false;
                wordType = WordType.TAG_NAME;
            }
            else if (ch === '(' && notInAllSection) {
                tagStack.push('(');
                tierStack.push(tier);
            }
            else if (ch === ')' && notInAttrSection) {
                completePrevTag(true, iterNum);
                tier=tierStack.pop();
                tagStack.push(')');
                wordType = WordType.COMPLETE;
                word = '';
                iterNum = '';
                iterMode = false;
            }
            else if (ch === '[' && notInValueSection) {
                if (wordType != WordType.ATTR) {
                    completePrevAttribute();
                    word = "";
                    wordType = WordType.ATTR;
                }
            }
            else if (ch === '=' && notInValueSection) {
                if (wordType == WordType.ATTR) {
                    if (propKey.length > 0) {

                    }
                    else {
                        propKey = word;
                        word = '';
                    }

                }

            }
            else if (ch === ',' && notInValueSection) {
                if (wordType == WordType.ATTR) {
                    if (propKey.length > 0) {
                        propVal = word;
                        tag.props.push({key:propKey,value:propVal});

                        propKey = '';
                        word = '';
                    }
                }
            }
            else if (ch === ']' && notInValueSection) {
                if (wordType == WordType.ATTR) {
                    if (propKey.length > 0) {
                        propVal = word;
                        tag.props.push({key:propKey,value:propVal});
                        propKey = '';
                        word = '';
                        wordType = WordType.END_ATTR;
                    }
                    else {
                    }
                }

            }
            else if (ch === '*' && notInAllSection) {
                iterMode = true;
            }

            else if (ch === '@' && notInAttrSection) {

                if (wordType != WordType.VALUE) {
                    wordType = WordType.VALUE;
                    tag.type = 'textNode';
                }
                else {

                }
            }
            else if (ch === '\\') {
                textMode = true;
            }
            else if (notInAllSection&& (ch === '\n' || ch === ' ')) {
            }
            else {
                if (iterMode) iterNum += ch;
                else {
                    word += ch;
                }
                textMode = false;
            }
            idx++;
        }
        completePrevTag(true, iterNum);
        flashback(tagStack);
        return handle('build',tagStack);

    };
    //显示某一时间点的对象信息
    // 由于console.log打印出的对象信息永远是最新的
    // 也就是说如果某一个对象发生了变动 console.log(这个对象)即使是变动之前打印的仍然会显示改动之后的信息
    function flashback(obj) {
        var s = '';
        for (var v in obj) {
            s += JSON.stringify(obj[v]) + '\n';
        }
        console.log(s);
    }

    //递归的方式构建html 该函数定义一次递归 即构建一个括号里的标签html
    function buildHtml(tagStack,iterNum) {
        console.log(arguments);
        var tag,
            html = '', t;
        iterNum = iterNum || 0;
        while (tagStack.length > 0) {
            tag = tagStack.pop();
            if (tag instanceof Tag) {
                html = tag.toHTML(html);
                console.log(html);
            }
            else if (typeof tag == 'string' && tag.charAt(0) == ')') {
                //递归到嵌套的括号里面
                t = buildHtml(tagStack,+tag.split('*')[1] || 0);
                //console.log('本级:', html, '接受上级:', t);
                html = t + html;
            }
            else if (tag === '(') {
                //完成本次构建(即一个括号内的)
                //console.log('交给下级:', html);
                if (iterNum > 0) return repeatTag(html, iterNum);
                else {
                    return html;
                }
            }
        }
        //console.log('交给下级:', html);
        //完成全部构建
        if (iterNum > 0) return repeatTag(html, iterNum);
        else {
            return html;
        }
    }
    function addIndent(tag,pos){
        var ret='';
        if(pos===1||pos===-1&&!tag.isClosed){
            for(var i=0;i<tag.tier;i++){
                ret+='    ';
            }
        }
        else if(pos===-2||!tag.isClosed&&pos===2){
                ret='\n';
        }
        return ret;

    }
    appendHandler('build',buildHtml);
    /**
     * 启用代码缩进
     * */
    function enableIndent(flag){
        if(flag){
            setHandler('tagHtmlRim',addIndent);
        }
        else {
            removeHandler('tagHtmlRim',addIndent);
        }
    }
    /**
     * 语法检查 出现错误则抛出异常
     * 一场中
     * */
    function inspectSyntax(code) {
        var ch = '',
            lch,
            idx = 0,
            lb = 0,
            rb = 0,
            textMode = false,
            wordType = -1,
            isSpecs, isAttrSpecs, isValueSpecs,
            propState = 0;//属性解析状态 1代表出现了key 0代表出现了value 也代表初始状态

        while (idx < code.length) {
            if (ch != '\n' && ch != ' '){
                lch = ch;
            }
            ch = code.charAt(idx);
            isSpecs = !textMode && wordType != WordType.ATTR && wordType != WordType.VALUE;//是否是普通关键字
            isAttrSpecs = !textMode && wordType != WordType.VALUE;//是否是属性描述关键字
            isValueSpecs = !textMode && wordType != WordType.ATTR;//是否是文本节点关键字
            if (ch === '(' && isSpecs) {
                lb++;
                if (lch != '+' && lch != '>' && lch != ')' && lch != '' && lch != '(') {
                    parseError('Unexpected token "(" ', code, idx);
                }
            }
            else if (ch === ')' && isValueSpecs) {
                rb++;
                if (lch == '+' || lch == '>' || lch == '(') {
                    parseError('Unexpected token ")" ', code, idx);
                }
            }
            if (ch === '.' && isSpecs) {
                if (lch === '+' || lch === '>' || lch === '*' || lch === '(' || lch === ')') {
                    parseError('Unexpected token ' + ch, code, idx)
                }
            }
            else if (ch === '#' && isSpecs) {
                if (lch === '+' || lch === '>' || lch === '*' || lch === '(' || lch === ')') {
                    parseError('Unexpected token ' + ch, code, idx)
                }
            }
            else if (ch === '>' && isValueSpecs) {
                if (lch == '+' || lch == '>' || lch == ')' || lch == '(') {
                    parseError('Unexpected token >', code, idx)
                }
            }
            else if (ch === '+' && isValueSpecs) {
                if (lch == '+' || lch == '>' || lch == '(') {
                    parseError('Unexpected token +', code, idx)
                }
            }
            else if (ch === '[' && isAttrSpecs) {
                if (lch === '+' || lch === '>' || lch === '*' || lch === '(' || lch === ')') {
                    parseError('Unexpected token ' + ch, code, idx)
                }
                if (wordType != WordType.ATTR) {
                    wordType = WordType.ATTR;
                }
                else parseError('Unexpected token [', code, idx);
            }
            else if (ch === '=' && isAttrSpecs) {
                if (wordType == WordType.ATTR) {
                    if (lch == '[' || lch == ',' || lch == '=') parseError('Unexpected token "="', code, idx);
                    if (propState == 0) {
                        propState = 1;
                    }
                    else {
                        parseError('Unexpected token "=" !maybe you lost ","', code, idx);
                    }
                }
                else parseError('"=" must in attribute definition!(eg.[name=value])', code, idx);

            }
            else if (ch === ',' && isAttrSpecs) {
                if (wordType == WordType.ATTR) {
                    if (lch == '[' || lch == ',' || lch == '=') parseError('Unexpected token ",".', code, idx);
                    if (propState == 1) {
                        propState = 0;
                    }
                    else {
                        parseError('Unexpected token "," maybe you lost "=".', code, idx);
                    }
                }
                else parseError('"," must in attribute definition!(eg.[n1=v1,n2=v2])', code, idx);
            }
            else if (ch === ']' && isAttrSpecs) {
                if (wordType == WordType.ATTR) {
                    if (lch === ',' || lch === '=') {
                        parseError('Unexpected token "' + lch + '".', code, idx);
                    }
                    else if (lch === '[') {
                        parseError('Can not define a empty attribute.', code, idx);
                    }

                    if (propState == 0) {
                        parseError('Unexpected token "]" maybe a attribute is not completed.', code, idx);
                    }
                    propState = 0;
                    wordType = -1;
                }
                else parseError('Unexpected token "]".', code, idx);
            }
            else if (ch === '*' && isSpecs) {
                if (lch === '+' || lch === '>' || lch === '*' || lch === '(') {
                    parseError('Unexpected token "' + ch+'".', code, idx)
                }
            }

            else if (ch === '@' && isValueSpecs) {
                if (wordType == WordType.VALUE) {
                    wordType = -1;

                }
                else {
                    if (lch !== '>' && lch !== '+') {
                        parseError('textNode @ must after ">" or "+".', code, idx);
                    }
                    wordType = WordType.VALUE;
                }
            }
            else if (ch === '\\') {
                textMode = true;
            }

            else if (isSpecs && (ch === '\n' || ch === ' ')) {

            }
            else {
                if (lch == ')') {
                    parseError('"+" or ">" or "*" is missing.', code, idx);
                }
                ch = 'a';
                textMode = false;
            }

            idx++;
        }
        if (lb != rb) {
           parseError('Unmatched "(" and ")".',code,idx);
        }
    }

//定位错误位置
    function locErrPos(code, idx) {
        var i = idx - 5, j = idx + 5;
        return '[index:' + idx + (i > 0 ? ' at:"..' : ' at:"') + code.substring(i, j) + (j < code.length ? '.."]' : '"]');
    }

    //统一抛出错误
    function parseError(message, code, idx) {
        var e = new Error(message + ' ' + locErrPos(code, idx));
        e.name = 'ParseError';
        e.idx = idx;
        throw e;
    }

    return {
        /**
         * 解析
         * */
        parse: parse,
        inspectSyntax:inspectSyntax,
        enableIndent:enableIndent,
        pushHandler:pushHandler,
        appendHandler:appendHandler,
        removeHandler:removeHandler,
        setHandler:setHandler
    }

}(window);