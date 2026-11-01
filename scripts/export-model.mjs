import fs from 'node:fs/promises';
import {buildSite} from '../dist/model.js';
import {GLTFExporter} from '../dist/vendor/GLTFExporter.js';

globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();if(this.onloadend)this.onloadend();}
  async readAsDataURL(blob){this.result=`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;if(this.onloadend)this.onloadend();}
};
const {root}=buildSite();
root.updateMatrixWorld(true);
const result=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
const out=new URL('../dist/assets/world-dreams-exterior.glb',import.meta.url);
await fs.writeFile(out,Buffer.from(result));
console.log(`GLB exported: ${result.byteLength} bytes`);
