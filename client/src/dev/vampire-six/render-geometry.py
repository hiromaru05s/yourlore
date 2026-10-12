"""Standalone anatomical inspection, not a browser screenshot or real-board QA."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[4]
qa=root/'docs/vfx-prototypes/2026-10-12-vampire-fang-anatomy-r6/qa'
models=json.loads((qa/'geometry.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=1160;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22);scene.view_settings.view_transform='AgX'
def material(name,color,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
cardmat=material('neutral card for geometric inspection',(.24,.20,.20),.8)
boardmat=material('studio background',(.71,.68,.64),.9)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(boardmat);bpy.context.object.location.z=-.035
for loc,energy,size in [((-4,-2,8),1250,5),((5,3,6),950,4),((0,6,10),1000,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.5,-6.5,18));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=11.3;scene.camera=cam
objects=[]
for v in range(6):
 x=(v%3-1)*3.5;y=(.5-v//3)*3.8
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,0));o=bpy.context.object;o.scale=(1.80,2.80,.028);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(cardmat);mod=o.modifiers.new('rounded card edges','BEVEL');mod.width=.035;mod.segments=3
 bpy.ops.object.text_add(location=(x-.85,y+1.6,.04));o=bpy.context.object;o.data.body=f'{v+1:02}';o.data.size=.20;o.data.materials.append(material('number '+str(v),(.075,.015,.025)))
for pose in [0,1]:
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
 objects=[]
 for model in models:
  v=model['variant']
  if (model['time']==930)!=(pose==0):continue
  ox=(v%3-1)*3.5;oy=(.5-v//3)*3.8
  for j,d in enumerate(model['meshes']):
   me=bpy.data.meshes.new(f'{v}-{j}');verts=[(x*.01+ox,y*.01+oy,z*.01+.02) for x,y,z in d['vertices']];ix=d['indices'];faces=[ix[k:k+3] for k in range(0,len(ix),3)];me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(me.name,me);scene.collection.objects.link(o);objects.append(o)
   for p in me.polygons:p.use_smooth=True
   m=material(me.name,d['color'],d['roughness']);nodes=m.node_tree.nodes;links=m.node_tree.links;bsdf=nodes.get('Principled BSDF')
   if d['colors']:
    attr=me.color_attributes.new(name='enamel',type='FLOAT_COLOR',domain='POINT');c=d['colors'];base=d['color']
    for k in range(len(verts)):attr.data[k].color=tuple(c[k*3+i]*base[i] for i in range(3))+(1,)
    n=nodes.new('ShaderNodeVertexColor');n.layer_name='enamel';links.new(n.outputs['Color'],bsdf.inputs['Base Color'])
   if d['unlit']:bsdf.inputs['Roughness'].default_value=1
   me.materials.append(m)
 scene.render.filepath=str(qa/('geometry-open.png' if pose==0 else 'geometry-contact.png'));bpy.ops.render.render(write_still=True)
print('Standalone meshes rendered. Browser appearance and real-board behavior are not covered.')
