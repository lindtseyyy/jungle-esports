import {
  Color,
  MeshStandardMaterial,
  ShaderChunk,
  type MeshStandardMaterialParameters,
} from 'three';

/** One shared lighting model. Retains three's PBR specular, shadows, skinning and AO. */
export function toonMaterial(parameters: MeshStandardMaterialParameters = {}) {
  const material = new MeshStandardMaterial({ roughness: 0.85, ...parameters });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.jungleShadow = { value: new Color('#8DAFAD') };
    shader.uniforms.jungleRim = { value: new Color('#9FD3E6') };
    shader.fragmentShader = `uniform vec3 jungleShadow;\nuniform vec3 jungleRim;\nvarying float jungleHeight;\n${shader.fragmentShader}`;
    shader.vertexShader = `varying float jungleHeight;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\njungleHeight = (modelMatrix * vec4(transformed, 1.0)).y;',
    );
    const lighting = ShaderChunk.lights_physical_pars_fragment.replace(
      'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\n\tvec3 irradiance = dotNL * directLight.color;',
      `float wrapped = clamp((dot(geometryNormal, directLight.direction) + 0.25) / 1.25, 0.0, 1.0);
       float dotNL = 0.18 + 0.36 * smoothstep(0.22, 0.35, wrapped) + 0.46 * smoothstep(0.62, 0.78, wrapped);
       vec3 irradiance = dotNL * directLight.color * mix(jungleShadow, vec3(1.04, 1.0, 0.92), wrapped);`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', lighting)
      .replace(
        '#include <opaque_fragment>',
        `
        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
        outgoingLight += jungleRim * rim * 0.075 * diffuseColor.rgb;
        #include <opaque_fragment>`,
      )
      .replace(
        '#include <fog_fragment>',
        `
        #ifdef USE_FOG
          float heightDensity = exp(-max(jungleHeight, 0.0) * 0.06);
          float jungleFog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth * heightDensity);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, jungleFog);
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'jungle-toon-g1-v1';
  return material;
}
