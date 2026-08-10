/**
 * Regression tests for the security patches described in ../PATCHES.md.
 * Each crafted buffer causes an infinite loop on unpatched image-size <= 2.0.2.
 */
const { ICNS } = require('../dist/types/icns');
const { JXL } = require('../dist/types/jxl');

describe('image-size security patches', () => {
  test('CVE-2025-71330: ICNS entry with zero length field terminates', () => {
    const icns = Buffer.alloc(32);
    icns.write('icns', 0, 'ascii');
    icns.writeUInt32BE(32, 4); // file length
    icns.write('ic07', 8, 'ascii'); // valid icon type
    icns.writeUInt32BE(0, 12); // entry length 0 -> offset never advances

    expect(ICNS.validate(icns)).toBe(true);
    expect(() => ICNS.calculate(icns)).toThrow(TypeError);
  });

  test('CVE-2025-71329: JXL container with zero-sized jxlp box terminates', () => {
    const jxl = Buffer.alloc(64);
    jxl.writeUInt32BE(12, 0); // signature box size
    jxl.write('JXL ', 4, 'ascii');
    jxl.writeUInt32BE(20, 12); // ftyp box size
    jxl.write('ftyp', 16, 'ascii');
    jxl.write('jxl ', 20, 'ascii'); // brand
    jxl.writeUInt32BE(0, 32); // jxlp box size 0 -> offset never advances
    jxl.write('jxlp', 36, 'ascii');

    expect(JXL.validate(jxl)).toBe(true);
    // any thrown error is fine - the point is that calculate() terminates
    expect(() => {
      try {
        JXL.calculate(jxl);
      } catch {
        /* expected: malformed image */
      }
    }).not.toThrow();
  });
});
