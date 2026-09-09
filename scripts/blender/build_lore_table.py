"""Rebuild the reference table using Blender (no image-to-mesh service).

Blender --background --factory-startup --python scripts/blender/build_lore_table.py
GLB: metres, Y up, tabletop at Y=0. Source Blender: Z up, tabletop at Z=0.
"""
import bpy
import bmesh
import numpy as np
import math
import json
import struct
import zlib
import hashlib
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/3d-assets/2026-09-08-blender-table'
OUTPUT = ROOT / 'client/public/models/lore-table'
W, D, R, H = 1.60, 1.02, .40, .075
for path in (SOURCE / 'textures', OUTPUT):
    path.mkdir(parents=True, exist_ok=True)


def png(path, pixels):
    h, w, _ = pixels.shape
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    raw = b''.join(b'\0' + row.tobytes() for row in pixels)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def make_textures(size, tag):
    # Signed distance to the rounded rectangle: two perfectly flat printed lines.
    w, h = size, round(size * D / W)
    x = ((np.arange(w, dtype=np.float32) + .5) / w - .5) * W
    y = ((np.arange(h, dtype=np.float32) + .5) / h - .5) * D
    xx, yy = np.meshgrid(x, y)
    def distance(inset):
        qx = np.abs(xx) - (W / 2 - R)
        qy = np.abs(yy) - (D / 2 - R)
        return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - (R - inset)
    aa = W / w
    mask = np.zeros((h, w), np.float32)
    for inset, line_width in ((.030, .0024), (.043, .0019)):
        mask = np.maximum(mask, np.clip((line_width / 2 + aa / 2 - np.abs(distance(inset))) / aa, 0, 1))
    # Leave a small gap through both lines around each north/south diamond.
    mask[np.abs(xx) < .018] = 0
    for sign in (-1, 1):
        diamond = np.abs(xx) / .012 + np.abs(yy - sign * (D / 2 - .0365)) / .0095
        mask = np.maximum(mask, np.clip((1 - diamond) * .0095 / aa + .5, 0, 1))
    ivory = np.array([242, 239, 231], np.float32)
    gold = np.array([140, 100, 55], np.float32)
    color = np.rint(ivory + mask[..., None] * (gold - ivory)).astype(np.uint8)
    # glTF ORM uses roughness=G, metallic=B. No normal/height/displacement.
    orm = np.empty((h, w, 3), np.uint8)
    orm[..., 0] = 255
    orm[..., 1] = np.rint(184 - mask * 82).astype(np.uint8)
    orm[..., 2] = np.rint(mask * 38).astype(np.uint8)
    color_path = SOURCE / 'textures' / f'top-{tag}-color.png'
    orm_path = SOURCE / 'textures' / f'top-{tag}-orm.png'
    png(color_path, color)
    png(orm_path, orm)
    return color_path, orm_path


def linear(rgb):
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)


def material(name, rgb, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    color = (*linear(tuple(v / 255 for v in rgb)), 1)
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = color
    return mat


def top_material(paths):
    mat = material('body', (242, 239, 231), 0, .72)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    base = nodes.new('ShaderNodeTexImage')
    base.image = bpy.data.images.load(str(paths[0]), check_existing=True)
    base.image.colorspace_settings.name = 'sRGB'
    links.new(base.outputs['Color'], bsdf.inputs['Base Color'])
    orm = nodes.new('ShaderNodeTexImage')
    orm.image = bpy.data.images.load(str(paths[1]), check_existing=True)
    orm.image.colorspace_settings.name = 'Non-Color'
    separate = nodes.new('ShaderNodeSeparateColor')
    links.new(orm.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(separate.outputs['Blue'], bsdf.inputs['Metallic'])
    return mat


def contour(inset, segments):
    points = []
    radius = R - inset
    # Counter-clockwise in Blender XY; +Y is the far side of the reference.
    for cx, cy, start in ((W/2-R, D/2-R, 0), (-W/2+R, D/2-R, 90), (-W/2+R, -D/2+R, 180), (W/2-R, -D/2+R, 270)):
        for step in range(segments + 1):
            angle = math.radians(start + step * 90 / segments)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def table(segments, top_mat):
    # Profile is top to bottom; decorative edge bands stay BELOW the flat top.
    profile = [(.006, 0), (.003, -.001), (.001, -.003), (0, -.006),
               (0, -.008), (0, -.010), (0, -.063), (.0005, -.068),
               (.001, -.070), (.0016, -.0715), (.003, -.073), (.006, -.075)]
    vertices, faces, slots = [], [], []
    count = len(contour(0, segments))
    for inset, z in profile:
        vertices.extend((x, y, z) for x, y in contour(inset, segments))
    for ring in range(len(profile) - 1):
        slot = 1 if ring in (0, 3, 4, 8) else (0 if ring < 3 else 2)
        for i in range(count):
            j = (i + 1) % count
            faces.append((ring*count+i, (ring+1)*count+i, (ring+1)*count+j, ring*count+j))
            slots.append(slot)
    top_index = len(vertices)
    vertices.append((0, 0, 0))
    bottom_index = len(vertices)
    vertices.append((0, 0, -H))
    for i in range(count):
        j = (i + 1) % count
        faces.append((top_index, i, j)); slots.append(0)
        base = (len(profile) - 1) * count
        faces.append((bottom_index, base+j, base+i)); slots.append(2)
    mesh = bpy.data.meshes.new('Table_closed_manifold')
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(top_mat)
    mesh.materials.append(material('trim', (164, 127, 77), .40, .40))
    mesh.materials.append(material('accent', (16, 26, 46), .05, .42))
    mesh.update()
    obj = bpy.data.objects.new('LORE_Ivory_Table', mesh)
    bpy.context.collection.objects.link(obj)
    uv = mesh.uv_layers.new(name='TableUV')
    for poly, slot in zip(mesh.polygons, slots):
        poly.material_index = slot
        poly.use_smooth = len(poly.vertices) == 4
        for loop in poly.loop_indices:
            v = mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv = (v.x / W + .5, v.y / D + .5) if len(poly.vertices) == 3 and slot == 0 else (.5, .5)
    # Force the exact horizontal normal over every top triangle, including the perimeter.
    obj['asset_id'] = 'lore_table_ivory_v1'
    obj['tabletop_height_m'] = 0.0
    obj['dimensions_m'] = [W, D, H]
    obj['note'] = 'Gold lines are flat color/roughness/metallic textures, never raised geometry.'
    bm = bmesh.new(); bm.from_mesh(mesh)
    assert all(edge.is_manifold for edge in bm.edges), 'Non-manifold table'
    bm.free()
    assert all(abs(mesh.vertices[v].co.z) < 1e-9 for p in mesh.polygons if len(p.vertices) == 3 and p.material_index == 0 for v in p.vertices)
    mesh.calc_loop_triangles()
    return obj, len(mesh.loop_triangles)


def aim(obj, point=(0, 0, 0)):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def studio():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1672
    scene.render.resolution_y = 941
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.world.color = (.30, .30, .30)
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.65, .65, .65, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    bpy.ops.object.camera_add(location=(0, -2.12, 1.60))
    cam = bpy.context.object
    cam.name = 'Preview_Camera_NOT_EXPORTED'
    cam.data.type = 'PERSP'; cam.data.lens = 51
    aim(cam, (0, .055, -.025)); scene.camera = cam
    for name, loc, power, size in [('Key', (-1.6, -1.4, 2.8), 220, 2.2), ('Fill', (1.6, -.2, 2.0), 90, 2.0), ('Rim', (0, 1.8, 2.4), 170, 2.0)]:
        data = bpy.data.lights.new('Studio_' + name, 'AREA')
        data.energy = power; data.shape = 'DISK'; data.size = size
        light = bpy.data.objects.new('Studio_' + name, data)
        scene.collection.objects.link(light); light.location = loc; aim(light)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -H-.0007))
    floor = bpy.context.object; floor.name = 'Studio_Ground_NOT_EXPORTED'
    floor.data.materials.append(material('Studio_Grey', (165, 168, 175), 0, .85))


def main():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    metadata = {'asset_id': 'lore_table_ivory_v1', 'reference': 'reference.png', 'generator': 'scripts/blender/build_lore_table.py',
                'blender_version': bpy.app.version_string, 'units': 'meters', 'gltf_up': '+Y',
                'gltf_dimensions_xyz_m': [W, H, D], 'tabletop_y_m': 0, 'corner_radius_m': R,
                'dimensions_are': 'working dimensions inferred from the reference; not an existing field size contract',
                'top_surface': 'exact plane, flat normals, no normal or displacement maps', 'variants': {}}
    main_obj = None
    for tag, segments, size in [('standard', 32, 2048), ('low', 12, 1024)]:
        obj, triangles = table(segments, top_material(make_textures(size, tag)))
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
        path = OUTPUT / ('table.glb' if tag == 'standard' else 'table-low.glb')
        bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                                  export_apply=True, export_yup=True, export_extras=True,
                                  export_cameras=False, export_lights=False, export_animations=False,
                                  export_materials='EXPORT', export_image_format='AUTO')
        metadata['variants'][tag] = {'file': str(path.relative_to(ROOT)), 'triangles': triangles,
                                    'materials': 3, 'draw_calls': 3, 'bytes': path.stat().st_size,
                                    'texture_size': [size, round(size*D/W)], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        if tag == 'standard': main_obj = obj
        else: bpy.data.objects.remove(obj, do_unlink=True)
    studio()
    bpy.ops.object.select_all(action='DESELECT'); main_obj.select_set(True); bpy.context.view_layer.objects.active = main_obj
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.shading.type = 'MATERIAL'
    for image in bpy.data.images:
        if image.source == 'FILE': image.pack()
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'lore-ivory-table.blend'))
    scene = bpy.context.scene
    scene.render.filepath = str(SOURCE / 'preview.png')
    bpy.ops.render.render(write_still=True)
    (SOURCE / 'manifest.json').write_text(json.dumps(metadata, indent=2) + '\n')
    (OUTPUT / 'manifest.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('LORE_TABLE_RESULT ' + json.dumps(metadata))


if __name__ == '__main__':
    main()
