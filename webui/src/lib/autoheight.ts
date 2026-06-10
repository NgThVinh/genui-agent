// Appended to every card's HTML. Reports content height to the host on a PRIVATE
// channel ("genui-internal") that can't collide with the agent's "genui" data
// messages. Verbatim behavior from the legacy frontend.
export const AUTOHEIGHT =
  '\n<script>(function(){function r(){var h=Math.max(document.body?document.body.scrollHeight:0,document.documentElement?document.documentElement.scrollHeight:0);parent.postMessage({source:"genui-internal",type:"height",value:h},"*");}window.addEventListener("load",r);window.addEventListener("resize",r);try{if(window.ResizeObserver&&document.body){new ResizeObserver(r).observe(document.body);}}catch(e){}setTimeout(r,60);setTimeout(r,300);setTimeout(r,1000);})();<\/script>';
