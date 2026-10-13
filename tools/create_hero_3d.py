"""Build, animate and export the Tiholesye hero with Blender.

Usage:
  blender -b --python tools/create_hero_3d.py

Outputs:
  assets/hero-3d.glb        editable/runtime 3D asset
  assets/hero-3d-atlas.png  10 frames x 4 directions, transparent
  assets/hero-3d-preview.png
"""
import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metallic=0.0, rough=.75, emission=None):
    material=bpy.data.materials.new(name)
    material.diffuse_color=(*color, 1)
    material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=rough
    bsdf.inputs['Metallic'].default_value=metallic
    if emission:
        bsdf.inputs['Emission Color'].default_value=(*emission,1)
        bsdf.inputs['Emission Strength'].default_value=3.2
    return material

M={
 'hood':mat('Hood moss green',(0.20,.29,.08)),
 'hood_light':mat('Hood trim',(0.36,.44,.13)),
 'cloak':mat('Cloak',(0.24,.34,.10)),
 'skin':mat('Skin',(.72,.42,.23)),
 'hair':mat('Hair',(.18,.075,.035)),
 'leather':mat('Leather',(.25,.105,.035)),
 'leather_light':mat('Belt',(.43,.23,.07)),
 'shirt':mat('Linen',(.68,.61,.42)),
 'metal':mat('Buckle',(.64,.52,.18),.55,.3),
 'staff':mat('Staff',(.25,.105,.025)),
 'staff_light':mat('Staff highlights',(.47,.25,.055)),
 'gem':mat('Jade gem',(.015,.36,.075),.05,.24,(.02,.52,.10)),
 'eye':mat('Eyes',(.035,.025,.018)),
 'sole':mat('Boot soles',(.10,.045,.02)),
}

def add_uv(name, loc, scale, material, segments=16, rings=8, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);o.parent=parent
    bpy.ops.object.shade_flat();return o
def add_cube(name, loc, scale, material, parent=None, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);o.parent=parent
    if bevel:
        mod=o.modifiers.new('Soft block edges','BEVEL');mod.width=bevel;mod.segments=1
    return o
def add_cone(name,loc,r1,r2,depth,material,parent=None,vertices=12,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=depth,location=loc,rotation=rotation)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);o.parent=parent;bpy.ops.object.shade_flat();return o
def empty(name,loc,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o

root=empty('Hero_Root',(0,0,0))
body=empty('Body_Rig',(0,0,0),root)

# Boots and legs, each with its own animation pivot.
legL=empty('Leg_L_Pivot',(-.20,0,.70),body);legR=empty('Leg_R_Pivot',(.20,0,.70),body)
add_cube('Leg_L',(0,0,-.10),(.14,.15,.36),M['leather'],legL)
add_cube('Leg_R',(0,0,-.10),(.14,.15,.36),M['leather'],legR)
add_cube('Boot_L',(0,-.06,-.43),(.18,.25,.15),M['leather_light'],legL)
add_cube('Boot_R',(0,-.06,-.43),(.18,.25,.15),M['leather_light'],legR)
add_cube('Sole_L',(0,-.09,-.52),(.19,.27,.05),M['sole'],legL,.03)
add_cube('Sole_R',(0,-.09,-.52),(.19,.27,.05),M['sole'],legR,.03)

# Torso, tunic, belt and cape.
add_cone('Tunic',(0,0,1.22),.52,.36,.92,M['cloak'],body,12)
add_cube('Shirt front',(0,-.39,1.38),(.24,.06,.28),M['shirt'],body,.05)
add_cube('Belt',(0,-.01,1.05),(.53,.45,.09),M['leather'],body,.025)
add_cube('Buckle',(0,-.48,1.05),(.11,.035,.11),M['metal'],body,.025)
add_cone('Cape',(0,.29,1.27),.62,.31,1.10,M['cloak'],body,12,rotation=(math.radians(-7),0,0))
add_cone('Cape tail',(0,.41,.72),.52,.04,.83,M['hood'],body,9,rotation=(math.radians(12),0,0))

# Hood is a faceted shell around a visible face, with a long pointed back.
add_uv('Hood shell',(0,0,2.03),(.62,.55,.64),M['hood'],16,8,body)
add_cone('Hood point',(0,.36,2.42),.34,.015,.95,M['hood'],body,10,rotation=(math.radians(33),0,0))
add_uv('Face',(0,-.58,2.02),(.35,.085,.34),M['skin'],16,8,body)
# Pixel-like hair locks frame the face without hiding it.
add_cube('Hair top',(0,-.64,2.25),(.31,.055,.09),M['hair'],body,.035)
for x,z,angle in [(-.28,2.11,-8),(-.17,2.22,-4),(0,2.24,0),(.17,2.22,4),(.28,2.11,8)]:
    lock=add_cone('Hair lock',(x,-.65,z),.07,.035,.22,M['hair'],body,7)
    lock.rotation_euler.y=math.radians(angle)
for x in (-.13,.13):
    add_uv('Eye', (x,-.675,2.04),(.038,.018,.05),M['eye'],8,4,body)
add_cube('Hood brow',(0,-.63,2.31),(.42,.05,.09),M['hood_light'],body,.04)

# Arms are pivoted for walk and attack animation.
armL=empty('Arm_L_Pivot',(-.43,-.02,1.60),body);armR=empty('Arm_R_Pivot',(.43,-.02,1.60),body)
for name,pivot in [('L',armL),('R',armR)]:
    add_cone('Sleeve_'+name,(0,0,-.22),.20,.15,.50,M['hood'],pivot,10)
    add_uv('Hand_'+name,(0,-.02,-.49),(.15,.14,.16),M['skin'],10,6,pivot)

# Crooked staff is parented to right hand.
staff=empty('Staff_Rig',(0,-.02,-.47),armR)
add_cone('Staff shaft',(0,-.02,-.18),.055,.08,1.75,M['staff'],staff,8,rotation=(math.radians(-6),0,0))
add_cone('Staff branch',(0.08,-.02,.63),.05,.035,.48,M['staff_light'],staff,7,rotation=(0,math.radians(-28),0))
add_uv('Jade gem',(0.20,-.03,.84),(.16,.13,.21),M['gem'],10,6,staff)
add_uv('Gem core',(0.20,-.17,.84),(.055,.018,.075),M['shirt'],8,4,staff)

# Small shoulder satchel makes the silhouette recognisable from the back.
add_cube('Satchel',(-.43,.28,1.10),(.25,.13,.30),M['leather_light'],body,.07)
add_cone('Satchel strap',(-.15,-.02,1.48),.035,.035,1.15,M['leather'],body,8,rotation=(0,math.radians(-31),0))

# Lighting and orthographic presentation.
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));key=bpy.context.object;key.name='Warm key';key.data.energy=780;key.data.color=(1.0,.73,.46);key.data.shape='DISK';key.data.size=4
bpy.ops.object.light_add(type='AREA',location=(4,1,4));fill=bpy.context.object;fill.name='Cool fill';fill.data.energy=500;fill.data.color=(.42,.68,1);fill.data.size=3
bpy.ops.object.light_add(type='AREA',location=(0,4,5));rim=bpy.context.object;rim.name='Rim';rim.data.energy=620;rim.data.color=(.58,1,.44);rim.data.size=2
bpy.ops.object.camera_add(location=(0,-7.5,5.8));camera=bpy.context.object;camera.name='Game camera';bpy.context.scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=3.65
def track(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
track(camera,(0,0,1.25))

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples=4
scene.render.resolution_x=128;scene.render.resolution_y=128;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.render.image_settings.color_depth='8'
scene.render.resolution_percentage=100
scene.view_settings.look='AgX - Medium High Contrast'
scene.world=bpy.data.worlds.new('Tiholesye World')
scene.world.color=(.02,.025,.018)

def pose(kind,index):
    body.location=(0,0,.025 if index%2 else 0)
    body.rotation_euler=(0,0,0)
    legL.rotation_euler=(0,0,0);legR.rotation_euler=(0,0,0)
    armL.rotation_euler=(0,0,0);armR.rotation_euler=(0,0,0)
    staff.rotation_euler=(0,0,math.radians(2))
    if kind=='idle':
        body.location.z=.025*index
        armL.rotation_euler.x=math.radians(4-index*3)
    elif kind=='walk':
        phase=[-1,-.35,.45,1][index]
        legL.rotation_euler.x=math.radians(25*phase);legR.rotation_euler.x=math.radians(-25*phase)
        armL.rotation_euler.x=math.radians(-21*phase);armR.rotation_euler.x=math.radians(19*phase)
        body.location.z=.04 if index in (1,3) else 0
    else:
        if index==0:
            armR.rotation_euler=(math.radians(-36),math.radians(-18),math.radians(-38))
            armL.rotation_euler=(math.radians(18),0,math.radians(17))
            staff.rotation_euler=(math.radians(11),math.radians(-30),math.radians(-20))
            body.rotation_euler.z=math.radians(-10)
        else:
            armR.rotation_euler=(math.radians(74),math.radians(5),math.radians(58))
            armL.rotation_euler=(math.radians(-10),0,math.radians(-18))
            staff.rotation_euler=(math.radians(55),math.radians(20),math.radians(15))
            body.rotation_euler.z=math.radians(16)

# Export the neutral model. Object hierarchy remains named and editable.
pose('idle',0)
bpy.context.view_layer.objects.active=root;root.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'hero-3d.glb'),export_format='GLB',export_apply=True,export_materials='EXPORT')

directions=[0,math.radians(-90),math.radians(90),math.radians(180)]
frames=[('idle',0),('idle',1),('walk',0),('walk',1),('walk',2),('walk',3),('attack',0),('attack',0),('attack',1),('attack',1)]
frame_dir=os.path.join(OUT,'.hero3d_frames');os.makedirs(frame_dir,exist_ok=True)
for row,angle in enumerate(directions):
    root.rotation_euler.z=angle
    for col,(kind,index) in enumerate(frames):
        pose(kind,index);root.rotation_euler.z=angle
        scene.render.filepath=os.path.join(frame_dir,f'{row}_{col}.png')
        if not os.path.exists(scene.render.filepath):
            bpy.ops.render.render(write_still=True)

# Turntable preview: a single large hero render used for review/documentation.
root.rotation_euler.z=math.radians(-25);pose('idle',0);root.rotation_euler.z=math.radians(-25)
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
camera.data.ortho_scale=3.35
scene.render.filepath=os.path.join(OUT,'hero-3d-preview.png')
bpy.ops.render.render(write_still=True)
print('Created hero-3d.glb, 40 animation frames and preview')
