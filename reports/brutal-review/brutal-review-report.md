# Brutal End-to-End Demo Suite Review

Generated: 2026-03-08T02:58:39.082Z

## 1) Inventory Coverage

- Registered explorations audited: **111**
- Learning trails audited: **8**
- Internal graph references checked: **298**
- Unique external links checked live: **143**

## 2) Critical / High Findings

- No broken external links detected in this pass.

- **Restricted link (403)**: https://doi.org/10.1098/rstb.1952.0012 (live endpoint blocks automated checks)
- **Restricted link (403)**: https://www.feynmanlectures.caltech.edu/II_19.html (live endpoint blocks automated checks)

- **Restricted repo link (GitHub 404)**: https://github.com/brianbrewington/iterated_function_systems.git (likely private or access-controlled)

- No high-severity equation mismatches found.

- No broken internal references found.

## 3) Medium Findings

- **bifurcation-2d**: Low parameter-to-equation coverage (1/11); instructional math may not track controls.
- **custom-iterator**: Low parameter-to-equation coverage (4/23); instructional math may not track controls.
- **mandelbrot-logistic-3d**: Low parameter-to-equation coverage (0/10); instructional math may not track controls.
- **kleinian**: Low parameter-to-equation coverage (1/9); instructional math may not track controls.
- **double-pendulum**: Low parameter-to-equation coverage (1/12); instructional math may not track controls.
- **perceptron-bifurcation**: Low parameter-to-equation coverage (1/8); instructional math may not track controls.
- **nn-bifurcation**: Low parameter-to-equation coverage (0/9); instructional math may not track controls.
- **fluid-dynamics**: Low parameter-to-equation coverage (0/8); instructional math may not track controls.
- **lissajous**: Low parameter-to-equation coverage (0/5); instructional math may not track controls.
- **random-walk**: Low parameter-to-equation coverage (0/3); instructional math may not track controls.
- **wave-equation**: Tutorial implies direct speed effect from c, but dt scaling in implementation dampens the intuitive speed mapping.
- **relaxation-oscillator**: Low parameter-to-equation coverage (1/5); instructional math may not track controls.
- **bucket-brigade**: Low parameter-to-equation coverage (1/5); instructional math may not track controls.
- **ring-oscillator**: Low parameter-to-equation coverage (1/5); instructional math may not track controls.
- **charge-pump**: Low parameter-to-equation coverage (1/7); instructional math may not track controls.
- **ford-circles**: Low parameter-to-equation coverage (0/4); instructional math may not track controls.
- **shannon-boltzmann**: Low parameter-to-equation coverage (1/5); instructional math may not track controls.
- **fermats-principle**: Low parameter-to-equation coverage (1/6); instructional math may not track controls.
- **discrete-path-action**: Low parameter-to-equation coverage (0/3); instructional math may not track controls.
- **functional-derivative**: Low parameter-to-equation coverage (0/3); instructional math may not track controls.
- **euler-lagrange-bridge**: Low parameter-to-equation coverage (0/3); instructional math may not track controls.
- **phase-portrait**: Low parameter-to-equation coverage (0/9); instructional math may not track controls.
- **stability-regions**: Low parameter-to-equation coverage (1/5); instructional math may not track controls.
- **network-epidemic**: Displays mean-field ODE SIR while simulator is a stochastic discrete network process.
- **resonance**: Low parameter-to-equation coverage (0/5); instructional math may not track controls.
- **acoustic-beats**: Low parameter-to-equation coverage (0/4); instructional math may not track controls.
- **doppler-effect**: Low parameter-to-equation coverage (0/3); instructional math may not track controls.

- Redirected links requiring cleanup: 6

## 4) Pedagogical Scaffolding Findings

- Weakly scaffolded demos: **0**
- Developing demos: **0**
- Weak trails: **0**

Top weak demos (lowest scores):
- None

Trail scaffold audit:
- circles-to-fourier: steps=6, narrativeCoverage=83%, scaffold=strong
- road-to-chaos: steps=6, narrativeCoverage=83%, scaffold=strong
- calculus-from-scratch: steps=6, narrativeCoverage=83%, scaffold=strong
- path-to-infinite-dimensions: steps=6, narrativeCoverage=100%, scaffold=strong
- fractal-worlds: steps=6, narrativeCoverage=83%, scaffold=strong
- oscillations-and-circuits: steps=6, narrativeCoverage=83%, scaffold=strong
- networks: steps=5, narrativeCoverage=80%, scaffold=strong
- information-theory: steps=5, narrativeCoverage=80%, scaffold=strong

## 5) Remediation Priorities

1. Fix high-severity equation-implementation mismatch in `ode-integrator` (either adaptive RKF45 implementation or label/documentation correction).
2. Resolve all broken external links and normalize redirected links to final canonical URLs.
3. Add automated tests for equation fidelity metadata and internal graph integrity (foundations/extensions/trails).
4. Raise pedagogy floor by adding concise tutorial/guided steps/teaser content to weak-scaffold demos.
5. Introduce schema validation for trail steps and related-demo references at test time.

## 6) Artifacts

- `reports/brutal-review/inventory.json`
- `reports/brutal-review/link-check.json`
- `reports/brutal-review/equation-fidelity.json`
- `reports/brutal-review/pedagogy-audit.json`
- `reports/brutal-review/brutal-review-report.md`
