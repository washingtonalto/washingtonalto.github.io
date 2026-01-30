(async()=>{if(["RadioChoicePopup","BrowserTab","PageProperty","ListofObj_Base","ListofObj_to_Table","ListofObj_to_DelimitedText"].every(k=>typeof globalThis[k]==="undefined")){function sanitizeFileName(input,options={}){const{replacement="_",maxLength=255}=options;if(!input||typeof input!=="string"){return"file";}
let name=input.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[\x00-\x1F]/g,"").replace(/[\\\/:*?"<>|]/g,replacement).replace(/\s+/g," ").trim();name=name.replace(/[. ]+$/,"");if(!name){name="file";}
const windowsReserved=/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;if(windowsReserved.test(name)){name=`${name}_file`;}
if(name.length>maxLength){const extMatch=name.match(/(\.[^.]+)$/);const ext=extMatch?extMatch[1]:"";const base=name.slice(0,maxLength-ext.length);name=base+ext;}
return name;}
function resolvePath(root,path){return path.split(".").reduce((acc,key)=>acc&&acc[key],root);}
function getCookieObject(){if(!document.cookie){return{};}
return document.cookie.split("; ").reduce((acc,cookie)=>{const separatorIndex=cookie.indexOf("=");if(separatorIndex===-1){return acc;}
const name=cookie.slice(0,separatorIndex).trim();const value=cookie.slice(separatorIndex+1);try{acc[name]=decodeURIComponent(value);}catch{acc[name]=value;}
return acc;},{});}
function cookiesToCollection(cookieObject){const collection=[];Object.keys(cookieObject).forEach((name,index)=>{const item={name,value:cookieObject[name]};collection.push(item);collection[index]=item;if(!(name in collection)){collection[name]=item;}});Object.defineProperties(collection,{length:{value:collection.length,writable:false},item:{value(index){return this[index]||null;}},namedItem:{value(name){return this[name]||null;}}});return collection;}
function getallH1toH6(){let arrallH=new Array();let arrH1=Array.from(document.getElementsByTagName("H1"));let arrH2=Array.from(document.getElementsByTagName("H2"));let arrH3=Array.from(document.getElementsByTagName("H3"));let arrH4=Array.from(document.getElementsByTagName("H4"));let arrH5=Array.from(document.getElementsByTagName("H5"));let arrH6=Array.from(document.getElementsByTagName("H6"));arrallH=arrH1.concat(arrH2).concat(arrH3).concat(arrH4).concat(arrH5).concat(arrH6);return arrallH;}
function returnHTTPAllResponseHeaders(url){let strOutput;let xmlHttp=new XMLHttpRequest();xmlHttp.open("HEAD",url,false);try{xmlHttp.send();}catch(e){console.log("Error: "+e);}
xmlHttp.onload=function(){strOutput=xmlHttp.getAllResponseHeaders();};xmlHttp.onload();return strOutput;}
function getBackgroundImages(){const list=[];document.querySelectorAll("*").forEach(el=>{const style=getComputedStyle(el);const bg=style.backgroundImage;if(!bg||bg==="none")
return;const urls=bg.match(/url\((['"]?)(.*?)\1\)/g);if(!urls)
return;urls.forEach(entry=>{list.push({element:el,url:entry.replace(/url\((['"]?)(.*?)\1\)/,"$2"),cssText:bg,tagName:el.tagName,className:el.className||"",id:el.id||""});});});return list;}
class RadioChoicePopup{constructor({title="Choose an option",message="",options=[{label:"Option A",value:"A"},{label:"Option B",value:"B"}]}={}){this.title=title;this.message=message;this.options=options;this.id="radio-choice-popup";}
show(){return new Promise((resolve)=>{const existing=document.getElementById(this.id);if(existing){existing.remove();}
const overlay=document.createElement("div");overlay.id=this.id;overlay.innerHTML=`

        <div style="

          position:fixed;

          inset:0;

          background:rgba(0,0,0,0.45);

          display:flex;

          align-items:center;

          justify-content:center;

          z-index:2147483647;

          font-family:Arial,sans-serif;

        ">

          <div style="

            background:#fff;

            padding:16px 18px;

            width:320px;

            border-radius:8px;

            box-shadow:0 10px 25px rgba(0,0,0,.25);

          ">

            <div style="font-size:16px;font-weight:bold;margin-bottom:8px;">

              ${this.title}

            </div>



            ${

                        this.message

                         ? `<div style="margin-bottom:10px;font-size:13px;">${this.message}</div>`

                         : ""

}



            <form id="rcp-form">

              ${

                        this.options

                        .map(

                            (opt, index) => `<label style="display:block;margin:6px 0;font-size:13px;"><input
type="radio"
name="rcp"
value="${opt.value}"
${index===0?"checked":""}>${opt.label}</label>`)

                        .join("")

}



              <div style="margin-top:12px;text-align:right;">

                <button type="button" id="rcp-cancel">Cancel</button>

                <button type="submit" style="margin-left:8px;">OK</button>

              </div>

            </form>

          </div>

        </div>

      `;document.body.appendChild(overlay);const cleanup=(result)=>{overlay.remove();resolve(result);};overlay.querySelector("#rcp-cancel").onclick=()=>{cleanup(null);};overlay.querySelector("#rcp-form").onsubmit=(event)=>{event.preventDefault();const selected=overlay.querySelector('input[name="rcp"]:checked');cleanup(selected?selected.value:null);};});}}
class BrowserTab{static openWithHTML(htmlContent,windowName="_blank"){const win=window.open("",windowName);if(!win){alert("Popup blocked. Please allow popups for this site.");return;}
try{win.document.open();win.document.write(htmlContent);win.document.close();win.focus();}catch(error){console.error("BrowserTab error:",error);}}}
class PageProperty{pageTitle="";objProperty={};constructor(objProperty,pageTitle=""){this.pageTitle=pageTitle;this.objProperty=objProperty;}
displayPageHeaders(){let strHeader=this.pageTitle;let strOutput="<TITLE>"+strHeader+"</TITLE>";strOutput+="<H1>"+strHeader+"</H1>";for(let key in this.objProperty){strOutput+="<STRONG>"+key+"</STRONG>: ";strOutput+=PageProperty.formatObjvalues(this.objProperty[key])+"<BR>";}
strOutput+="<BR>";return strOutput;}
displayPageFooters(){return`

                    <BR><BR>

                    <DIV style='text-align: center;'>

                        <CITE>Copyright: (c) 2026, Washington Alto</CITE>

                    </DIV>

                `;}
static isValidHttpUrl(strTest){try{const url=new URL(strTest);return url.protocol==="http:"||url.protocol==="https:";}catch(_){return false;}}
static formatObjvalues(strCellinput){const tagsToReplace={"&":"&amp;","<":"&lt;",">":"&gt;"};const replaceTag=tag=>tagsToReplace[tag]||tag;const safe_tags_replace=str=>str.replace(/[&<>]/g,replaceTag);let strOutput;if(PageProperty.isValidHttpUrl(strCellinput)){strOutput=`

                        <A HREF="${strCellinput}" target="_blank">

                            ${decodeURIComponent(strCellinput)}

                        </A>

                    `;}else{strOutput=strCellinput==null||String(strCellinput).trim().length===0?"":safe_tags_replace(String(strCellinput).trim());}
return strOutput;}}
class ListofObj_Base{header=["No."];fields=[];collection=[];schema=[];title="";constructor(schema,collection){this.header=this.header.concat(Object.keys(schema));this.fields=Object.values(schema);this.collection=collection;this.schema=schema;}
setTitle(title=""){this.title=title;}
resolveField(objItem,resolver){if(typeof resolver==="function"){return resolver(objItem);}
return resolvePath(objItem,resolver);}
buildRows(){const rows=[];for(let i=0;i<this.collection.length;i++){const objItem=this.collection[i];const row=this.fields.map(resolver=>this.resolveField(objItem,resolver));rows.push([i+1,...row]);}
return rows;}
static formatValue(value){if(value==null)
return"";if(typeof value==="object"){return Array.from(value).map(v=>`${v.name}: ${v.value}`).join("; ");}
return String(value).trim();}}
class ListofObj_to_Table extends ListofObj_Base{objCSV="";static tableStyle(headerBackgroundColor="#FFC107"){return`

      <STYLE>

        table, th, td {

          border: 1px solid #9E9E9E;

          border-collapse: collapse;

        }

        th { background: ${headerBackgroundColor}; }

      </STYLE>

    `;}
render(csvFileName="download.csv"){let html="";if(this.title){html+=`<H1>${this.title}</H1>`;}
html+=ListofObj_to_Table.tableStyle();html+="<TABLE><TR>";this.header.forEach(h=>html+=`<TH>${h}</TH>`);html+="</TR>";const rows=this.buildRows();rows.forEach(row=>{html+="<TR>";row.forEach(cell=>{html+=`<TD>${ListofObj_Base.formatValue(cell)}</TD>`;});html+="</TR>";});html+="</TABLE><BR>";const objDelimTxt=new ListofObj_to_DelimitedText(this.schema,this.collection,{columnDelimiter:",",rowDelimiter:"\r\n"});this.objCSV=objDelimTxt.render();html+=ListofObj_to_Table.createCSVBloblink(this.objCSV,csvFileName);return html;}
static createCSVBloblink(objCSV,csvFileName="download.csv"){let linkText="Download as CSV";let objCSVBlob=new Blob([objCSV],{type:"text/csv"});let csvURL=window.URL.createObjectURL(objCSVBlob);let HTMLlink='<A href="'+
csvURL+'" download="'+
csvFileName+'">'+
linkText+"</A>";return HTMLlink;}}
class ListofObj_to_DelimitedText extends ListofObj_Base{constructor(schema,collection,options={}){super(schema,collection);this.columnDelimiter=options.columnDelimiter??",";this.rowDelimiter=options.rowDelimiter??"<BR>";}
render(){let output="";if(this.title){output+=`<STRONG>${this.title}</STRONG>`+this.rowDelimiter;}
output+=this.header.join(this.columnDelimiter)+
this.rowDelimiter;const rows=this.buildRows();rows.forEach(row=>{output+=row.map(v=>ListofObj_Base.formatValue(ListofObj_to_DelimitedText.escapeForCSV(ListofObj_to_DelimitedText.formatCSVcellvalues(v)))).join(this.columnDelimiter)+
this.rowDelimiter;});return output;}
static escapeForCSV(inputString){if(/[",\n]/.test(inputString)){return'"'+inputString.replace(/"/g,'""')+'"';}
return inputString;}
static formatCSVcellvalues(strCellinput){function CSVlistAttributes(arr){let strOutput="";for(let i=0;i<arr.length;i++){strOutput+=arr[i].name+": "+arr[i].value+";\n\r";}
return strOutput;}
let strOutput;if(typeof strCellinput==="object"){strOutput=CSVlistAttributes(strCellinput);}else{strOutput=String(strCellinput).trim();}
return strOutput;}}
const popup=new RadioChoicePopup({title:"SEO Web Page SEO Toolset",message:"Select the bookmarklet tool:",options:[{label:"Link Tool",value:"Link Tool"},{label:"Image Tool",value:"Image Tool"},{label:"Background Image Tool",value:"Background Image Tool"},{label:"Link Tag Tool",value:"Link Tag Tool"},{label:"Cookie Tool",value:"Cookie Tool"},{label:"Inline CSS Tool",value:"Inline CSS Tool"},{label:"Script Tool",value:"Script Tool"},{label:"HTTP Resource Tool",value:"HTTP Resource Tool"},{label:"H1 to H6 Header Tool",value:"H1 to H6 Header Tool"},{label:"Meta Tag Tool",value:"Meta Tag Tool"},{label:"HTTP Response Headers Tool",value:"HTTP Response Headers Tool"}]});const choice=await popup.show();if(choice==="Link Tool"){listofObject=document.links;tableschema={"Link URL":"href","Link Text":"innerText","Link outerHTML":"outerHTML","Link attributes":"attributes"};}else if(choice==="Image Tool"){listofObject=document.images;tableschema={"Image URL":"src","Image":el=>"<IMG width='200' src='"+el.src.trim()+"'>","Image Height":"height","Image Width":"width","Image Alt":"alt","Image Loading":"loading","Image srcset":"srcset","Image sizes":"sizes","Image attributes":"attributes"};}else if(choice==="Background Image Tool"){listofObject=getBackgroundImages();tableschema={"Image URL":"url","Image":el=>"<IMG width='200' src='"+el.url.trim()+"'>","CSS Text":"cssText","ID":"id","tagName":"tagName","className":"className"};}else if(choice==="Link Tag Tool"){listofObject=document.querySelectorAll("link");tableschema={"Rel":"rel","Href":"href","Attributes":"attributes"};}else if(choice==="Cookie Tool"){listofObject=cookiesToCollection(getCookieObject());tableschema={"Cookie Name":"name","Cookie Value":"value"};}else if(choice==="Inline CSS Tool"){listofObject=document.querySelectorAll("style");tableschema={"Style outerText":el=>el.outerText};}else if(choice==="Script Tool"){listofObject=document.scripts;tableschema={"Script id":"id","Script src":"src","Script async":"async","Script outerText":"outerText"};}else if(choice==="HTTP Resource Tool"){listofObject=performance.getEntriesByType("resource");tableschema={"Resource Type":"initiatorType","Resource Name":"name"};}else if(choice==="H1 to H6 Header Tool"){listofObject=getallH1toH6();tableschema={"Name":"tagName","Content":el=>el.innerText.trim(),"Content Length":el=>el.innerText.trim().length};}else if(choice==="Meta Tag Tool"){listofObject=document.querySelectorAll("meta[name]");tableschema={"Name":el=>el.attributes.name.value,"Content":el=>String(el.attributes.content.value).trim(),"Content Length":el=>String(el.attributes.content.value).trim().length};}else if(choice==="HTTP Response Headers Tool"){let responsetext=returnHTTPAllResponseHeaders(location.href);listofObject=responsetext.split("\n");listofObject.pop();tableschema={"Item-value Pair":el=>el,};}else{alert("User has clicked 'Cancel'");return;}
const page=new PageProperty({"Page URL":location.href,"Page Title":document.title,"Page Title Length":document.title.trim().length,"Tool choice":choice},"WLA Web Page SEO Toolset");let csvFileName=location.href+"_"+choice+".csv";let html=page.displayPageHeaders();const htmlTable=new ListofObj_to_Table(tableschema,listofObject);html+=htmlTable.render(csvFileName);html+=page.displayPageFooters();BrowserTab.openWithHTML(html);}})();