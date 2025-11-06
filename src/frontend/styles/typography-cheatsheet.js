/**
 * TYPOGRAPHY QUICK REFERENCE
 * 
 * Copy-paste these examples when styling text elements
 * 
 * ============================================================
 * CHAKRA UI COMPONENTS (RECOMMENDED)
 * ============================================================
 * 
 * <Text textStyle="smallLightWhite">Body text on dark background</Text>
 * <Text textStyle="smallHeavyWhite">Bold text on dark background</Text>
 * <Text textStyle="smallLightDark">Body text on light background</Text>
 * <Text textStyle="smallHeavyDark">Bold text on light background</Text>
 * <Text textStyle="largeLightWhite">Heading on dark background</Text>
 * <Text textStyle="largeHeavyWhite">Bold heading on dark background</Text>
 * <Text textStyle="largeLightDark">Heading on light background</Text>
 * <Text textStyle="largeHeavyDark">Bold heading on light background</Text>
 * 
 * ============================================================
 * CSS CLASSES
 * ============================================================
 * 
 * <div className="text-small-light-white">Body text on dark</div>
 * <div className="text-small-heavy-white">Bold text on dark</div>
 * <div className="text-small-light-dark">Body text on light</div>
 * <div className="text-small-heavy-dark">Bold text on light</div>
 * <div className="text-large-light-white">Heading on dark</div>
 * <div className="text-large-heavy-white">Bold heading on dark</div>
 * <div className="text-large-light-dark">Heading on light</div>
 * <div className="text-large-heavy-dark">Bold heading on light</div>
 * 
 * ============================================================
 * INLINE STYLES (JavaScript)
 * ============================================================
 * 
 * import { TEXT_STYLES } from '../styles/typography';
 * 
 * <span style={TEXT_STYLES.smallLightWhite}>Text</span>
 * <span style={TEXT_STYLES.smallHeavyWhite}>Text</span>
 * <span style={TEXT_STYLES.smallLightDark}>Text</span>
 * <span style={TEXT_STYLES.smallHeavyDark}>Text</span>
 * <span style={TEXT_STYLES.largeLightWhite}>Text</span>
 * <span style={TEXT_STYLES.largeHeavyWhite}>Text</span>
 * <span style={TEXT_STYLES.largeLightDark}>Text</span>
 * <span style={TEXT_STYLES.largeHeavyDark}>Text</span>
 * 
 * ============================================================
 * CHAKRA UI SX PROP
 * ============================================================
 * 
 * import { TEXT_STYLES } from '../styles/typography';
 * 
 * <Box sx={TEXT_STYLES.smallLightWhite}>Text</Box>
 * 
 * // Or mix with other styles:
 * <Box sx={{ ...TEXT_STYLES.largeLightDark, marginTop: '10px' }}>Text</Box>
 * 
 * ============================================================
 * DESIGN SYSTEM VALUES
 * ============================================================
 * 
 * Font Sizes:  small = 18px, large = 24px
 * Colors:      white = #ffffff, darkBlue = #0b334d  
 * Weights:     light = 400, heavy = 700
 * 
 * ============================================================
 * EXCEPTIONS
 * ============================================================
 * 
 * Balance card DC symbol and amounts should remain unchanged:
 * - BalanceCardV1.jsx
 * - BalanceCardV2.jsx
 * 
 */

export default {};
