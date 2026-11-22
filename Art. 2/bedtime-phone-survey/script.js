(function(){
 var counts={yes:0,no:0},mine=null,shown=false,db=null,uid=null,canWrite=null;
 var ch=document.getElementById('choices'),res=document.getElementById('results'),meta=document.getElementById('meta'),note=document.getElementById('note');
 function render(){
  var total=counts.yes+counts.no;
  ['yes','no'].forEach(function(k){
   var row=res.querySelector('[data-r="'+k+'"]'),p=total?Math.round(counts[k]/total*100):0;
   row.querySelector('.pct').textContent=p+'% ('+counts[k]+')';
   row.querySelector('.fill').style.width=p+'%';
   row.classList.toggle('mine',mine===k);
   row.querySelector('.tag').hidden=mine!==k;
  });
  meta.textContent=total===0?'No answers yet.':total===1?'1 person has answered so far.':total+' people have answered so far.';
 }
 function show(){
  if(shown)return;shown=true;
  ch.classList.add('hidden');res.classList.remove('hidden');
  render();
 }
 function saveFailed(){note.hidden=false;note.textContent='Your answer couldn\u2019t be saved, so it isn\u2019t counted in these results.'}
 function saveAnswer(){
  if(!db||!uid||mine===null)return;
  if(canWrite===false){saveFailed();return}
  db.doc('votes/'+uid).set({a:mine,at:Date.now()}).catch(function(){saveFailed()});
 }
 ch.addEventListener('click',function(e){
  var b=e.target.closest('button[data-a]');if(!b||mine)return;
  mine=b.getAttribute('data-a');
  counts[mine]+=1;
  show();
  saveAnswer();
 });
 function start(){
  if(!window.claude||!claude.use){saveFailed();return}
  Promise.all([claude.use('db'),claude.use('user')]).then(function(r){
   db=r[0];var user=r[1];if(!db)return;
   return Promise.resolve(user?user.id():null).then(function(id){uid=id;return user?user.can('data.write'):null}).then(function(c){
    canWrite=c;
    saveAnswer();
    db.collection('votes').onSnapshot(function(snap){
     var c={yes:0,no:0},own=null;
     snap.docs.forEach(function(d){var v=d.data()||{};if(v.a==='yes'||v.a==='no'){c[v.a]++;if(uid&&d.id===uid)own=v.a}});
     counts=c;
     if(own){mine=own;note.hidden=true;show()}
     if(shown)render();
    },function(){});
   });
  }).catch(function(){});
 }
 start();
})();
