/* Shared AES-256-GCM format; the secret stays in the URL fragment. */
(function(g){
  'use strict';
  const re=/^[A-Za-z0-9_-]+$/;
  function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function un64(s){if(typeof s!=='string'||!re.test(s))throw Error('invalid encoding');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));}
  const random=n=>b64(g.crypto.getRandomValues(new Uint8Array(n)));
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{22}$/.test(id);
  const validKey=key=>typeof key==='string'&&/^[A-Za-z0-9_-]{43}$/.test(key);
  function envelope(v){const e=typeof v==='string'?JSON.parse(v):v;if(!e||e.v!==1||!validId(e.id)||typeof e.iv!=='string'||!re.test(e.iv)||e.iv.length!==16||typeof e.cipher!=='string'||!re.test(e.cipher)||e.cipher.length<22||e.cipher.length>4200000)throw Error('invalid envelope');return e;}
  async function importKey(key){if(!validKey(key))throw Error('invalid key');return g.crypto.subtle.importKey('raw',un64(key),'AES-GCM',false,['encrypt','decrypt']);}
  async function seal(id,key,data){if(!validId(id))throw Error('invalid id');const iv=g.crypto.getRandomValues(new Uint8Array(12));const plain=new TextEncoder().encode(JSON.stringify(data));if(plain.length>3100000)throw Error('content too large');const cipher=await g.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('vanilla-pl-v1:'+id)},await importKey(key),plain);return envelope({v:1,id,iv:b64(iv),cipher:b64(new Uint8Array(cipher))});}
  async function open(value,key){const e=envelope(value);const plain=await g.crypto.subtle.decrypt({name:'AES-GCM',iv:un64(e.iv),additionalData:new TextEncoder().encode('vanilla-pl-v1:'+e.id)},await importKey(key),un64(e.cipher));const d=JSON.parse(new TextDecoder().decode(plain));if(!d||d.v!==1)throw Error('invalid data');return d;}
  g.VanillaPLCrypto={random,validId,validKey,envelope,seal,open,b64,un64};
})(window);
