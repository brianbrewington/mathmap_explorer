// GLSL complex arithmetic library — all operations on vec2(re, im)
export const complexMathGLSL = `
// Complex multiplication: (a+bi)(c+di)
vec2 cmul(vec2 a, vec2 b) {
  return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// Complex division: (a+bi)/(c+di)
vec2 cdiv(vec2 a, vec2 b) {
  float d = dot(b, b);
  if (d < 1e-30) return vec2(1e10);
  return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d;
}

// Complex square: z^2
vec2 csquare(vec2 z) {
  return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
}

// Complex power (integer n)
vec2 cpow_int(vec2 z, int n) {
  vec2 result = vec2(1.0, 0.0);
  for (int i = 0; i < 20; i++) {
    if (i >= n) break;
    result = cmul(result, z);
  }
  return result;
}

// Complex power (real exponent) via polar form
vec2 cpow(vec2 z, float p) {
  float r = length(z);
  if (r < 1e-12) return vec2(0.0);
  float theta = atan(z.y, z.x);
  float rp = pow(r, p);
  return vec2(rp * cos(p * theta), rp * sin(p * theta));
}

// Complex square root
vec2 csqrt(vec2 z) {
  float r = length(z);
  float theta = atan(z.y, z.x);
  float sr = sqrt(r);
  return vec2(sr * cos(theta * 0.5), sr * sin(theta * 0.5));
}

// Complex exponential: e^z
vec2 cexp(vec2 z) {
  float er = exp(z.x);
  return vec2(er * cos(z.y), er * sin(z.y));
}

// Complex logarithm: log(z)
vec2 clog(vec2 z) {
  return vec2(log(length(z)), atan(z.y, z.x));
}

// Complex sin: sin(z) = (e^(iz) - e^(-iz)) / 2i
vec2 csin(vec2 z) {
  return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// Complex cos: cos(z) = (e^(iz) + e^(-iz)) / 2
vec2 ccos(vec2 z) {
  return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
}

// Complex tan
vec2 ctan(vec2 z) {
  return cdiv(csin(z), ccos(z));
}

// Complex sinh
vec2 csinh(vec2 z) {
  return vec2(sinh(z.x) * cos(z.y), cosh(z.x) * sin(z.y));
}

// Complex cosh
vec2 ccosh(vec2 z) {
  return vec2(cosh(z.x) * cos(z.y), sinh(z.x) * sin(z.y));
}

// Complex tanh
vec2 ctanh(vec2 z) {
  return cdiv(csinh(z), ccosh(z));
}

// Complex asin
vec2 casin(vec2 z) {
  // asin(z) = -i * log(iz + sqrt(1 - z^2))
  vec2 iz = vec2(-z.y, z.x);
  vec2 one_minus_z2 = vec2(1.0, 0.0) - csquare(z);
  vec2 sq = csqrt(one_minus_z2);
  vec2 lg = clog(vec2(iz.x + sq.x, iz.y + sq.y));
  return vec2(lg.y, -lg.x); // multiply by -i
}

// Complex acos
vec2 cacos(vec2 z) {
  vec2 as = casin(z);
  return vec2(1.5707963 - as.x, -as.y);
}

// Complex atan
vec2 catan(vec2 z) {
  // atan(z) = i/2 * log((1-iz)/(1+iz))
  vec2 iz = vec2(-z.y, z.x);
  vec2 num = vec2(1.0 - iz.x, -iz.y);
  vec2 den = vec2(1.0 + iz.x, iz.y);
  vec2 lg = clog(cdiv(num, den));
  return vec2(-lg.y * 0.5, lg.x * 0.5); // multiply by i/2
}

// Complex absolute value as vec2(|z|, 0)
vec2 cabs_vec(vec2 z) {
  return vec2(length(z), 0.0);
}
`;
