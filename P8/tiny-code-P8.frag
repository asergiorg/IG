// Author:
// Title:

#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;uniform vec2 u_resolution,u_mouse;void main(){vec2 r=gl_FragCoord.xy/u_resolution-.5,m=u_mouse/u_resolution-.5,d=r-m;float q=length(d),f=exp(-2.5*q),s=sin(1.2*f),c=cos(1.2*f);d=mat2(c,-s,s,c)*d*(1.-.35*f*sin(10.*q-2.*u_time));vec2 z=m*.45*exp(-1.5*q),k=vec2(-.74,.13)+(m+d)*.0035;float i=0.;for(int n=0;n<500;n++){z=vec2(z.x*z.x-z.y*z.y,z.x*z.y+z.x*z.y)+k;if(dot(z,z)>6e4)break;i++;}gl_FragColor=vec4(i<500.?.5+.5*cos(6.3*(i*(.032+m.y*.015)+m.x*.4+vec3(0,.15,.35))):vec3(0),1.);}