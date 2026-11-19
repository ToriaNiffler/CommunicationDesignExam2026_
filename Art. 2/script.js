(function(){
 var st=document.getElementById('stage'),vd=document.getElementById('vid'),els=[].slice.call(document.querySelectorAll('[data-s]')).map(function(e){
  var s=[];e.getAttribute('data-s').split(',').forEach(function(r){var p=r.split('-').map(Number);for(var i=p[0];i<=(p[1]==null?p[0]:p[1]);i++)s.push(i)});return[e,s]}),cur=-1,hh=document.getElementById('hh'),mh=document.getElementById('mh');
 function vsync(n,prev){
  if(!vd)return;
  if(n===4||n===5){
   if(prev!==4&&prev!==5){
    vd.currentTime=0;
    var playback=vd.play();
    if(playback&&playback.catch)playback.catch(function(e){if(e.name!=='AbortError')console.warn('The background video could not start.',e)});
   }
  }else vd.pause();
 }
 function upd(){
  var n=Math.max(0,Math.min(18,Math.round(scrollY/innerHeight)));
  if(n===cur)return;var prev=cur;cur=n;st.setAttribute('data-step',n);
  els.forEach(function(x){x[0].classList.toggle('on',x[1].indexOf(n)>-1)});
  vsync(n,prev);
  var late=n>=6;hh.style.transform='rotate('+(late?375:351)+'deg)';mh.style.transform='rotate('+(late?540:252)+'deg)';
 }
 addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);upd();
 document.getElementById('top').onclick=function(){scrollTo({top:0,behavior:'smooth'})};
})();
