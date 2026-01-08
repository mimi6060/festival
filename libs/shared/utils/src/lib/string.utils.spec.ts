import {
  slugify,
  capitalize,
  capitalizeWords,
  truncate,
  stripHtml,
  isBlank,
  generateRandomString,
  maskEmail,
  maskCreditCard,
  maskPhone,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  padLeft,
  padRight,
  getInitials,
  escapeHtml,
  unescapeHtml,
  countWords,
  extractNumbers,
  extractLetters,
  reverseString,
  isPalindrome,
  normalizeWhitespace,
  hashCode,
  highlightSearchTerm,
  escapeRegex,
} from './string.utils';

describe('String Utils', () => {
  // ============================================================================
  // slugify
  // ============================================================================
  describe('slugify', () => {
    it('should convert text to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('should remove accents', () => {
      expect(slugify('Festival Ete 2024')).toBe('festival-ete-2024');
      expect(slugify('cafe resume naive')).toBe('cafe-resume-naive');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
      expect(slugify('Rock & Roll')).toBe('rock-roll');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('should handle multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(slugify('--hello-world--')).toBe('hello-world');
      expect(slugify('  hello world  ')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(slugify('Event 2024')).toBe('event-2024');
    });

    it('should handle French characters', () => {
      expect(slugify('Les Vieilles Charrues')).toBe('les-vieilles-charrues');
    });
  });

  // ============================================================================
  // capitalize
  // ============================================================================
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should lowercase rest of string', () => {
      expect(capitalize('hELLO')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('h')).toBe('H');
    });

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  // ============================================================================
  // capitalizeWords
  // ============================================================================
  describe('capitalizeWords', () => {
    it('should capitalize each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
    });

    it('should handle multiple words', () => {
      expect(capitalizeWords('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should lowercase and capitalize mixed case', () => {
      expect(capitalizeWords('hELLO wORLD')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalizeWords('')).toBe('');
    });
  });

  // ============================================================================
  // truncate
  // ============================================================================
  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 9, '---')).toBe('Hello---');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should trim trailing spaces before suffix', () => {
      expect(truncate('Hello World Test', 10)).toBe('Hello W...');
    });
  });

  // ============================================================================
  // stripHtml
  // ============================================================================
  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello</p>')).toBe('Hello');
    });

    it('should remove multiple tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });

    it('should handle attributes', () => {
      expect(stripHtml('<a href="url">Link</a>')).toBe('Link');
    });

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should handle text without HTML', () => {
      expect(stripHtml('Plain text')).toBe('Plain text');
    });
  });

  // ============================================================================
  // isBlank
  // ============================================================================
  describe('isBlank', () => {
    it('should return true for empty string', () => {
      expect(isBlank('')).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isBlank('   ')).toBe(true);
      expect(isBlank('\t\n')).toBe(true);
    });

    it('should return true for null', () => {
      expect(isBlank(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isBlank(undefined)).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isBlank('hello')).toBe(false);
    });

    it('should return false for string with content and spaces', () => {
      expect(isBlank('  hello  ')).toBe(false);
    });
  });

  // ============================================================================
  // generateRandomString
  // ============================================================================
  describe('generateRandomString', () => {
    it('should generate string of specified length', () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(20)).toHaveLength(20);
    });

    it('should contain only alphanumeric characters', () => {
      const result = generateRandomString(100);
      expect(result).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate different strings', () => {
      const str1 = generateRandomString(20);
      const str2 = generateRandomString(20);
      expect(str1).not.toBe(str2);
    });

    it('should handle zero length', () => {
      expect(generateRandomString(0)).toBe('');
    });
  });

  // ============================================================================
  // maskEmail
  // ============================================================================
  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j******e@example.com');
    });

    it('should handle short local part', () => {
      expect(maskEmail('ab@example.com')).toBe('ab@example.com');
    });

    it('should handle single character local part', () => {
      expect(maskEmail('a@example.com')).toBe('a@example.com');
    });

    it('should handle email without domain', () => {
      expect(maskEmail('nodomain')).toBe('nodomain');
    });

    it('should preserve domain completely', () => {
      const masked = maskEmail('test@subdomain.example.com');
      expect(masked.endsWith('@subdomain.example.com')).toBe(true);
    });
  });

  // ============================================================================
  // maskCreditCard
  // ============================================================================
  describe('maskCreditCard', () => {
    it('should show last 4 digits', () => {
      expect(maskCreditCard('4111111111111111')).toBe('**** **** **** 1111');
    });

    it('should handle formatted card number', () => {
      expect(maskCreditCard('4111-1111-1111-1111')).toBe('**** **** **** 1111');
    });

    it('should handle spaces in card number', () => {
      expect(maskCreditCard('4111 1111 1111 1111')).toBe('**** **** **** 1111');
    });

    it('should handle short card number', () => {
      expect(maskCreditCard('123')).toBe('123');
    });
  });

  // ============================================================================
  // maskPhone
  // ============================================================================
  describe('maskPhone', () => {
    it('should show last 4 digits', () => {
      expect(maskPhone('0612345678')).toBe('******5678');
    });

    it('should handle formatted phone', () => {
      expect(maskPhone('06 12 34 56 78')).toBe('******5678');
    });

    it('should handle international format', () => {
      expect(maskPhone('+33612345678')).toBe('*******5678');
    });

    it('should handle short phone number', () => {
      expect(maskPhone('123')).toBe('123');
    });
  });

  // ============================================================================
  // toCamelCase
  // ============================================================================
  describe('toCamelCase', () => {
    it('should convert space-separated text', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });

    it('should convert hyphen-separated text', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('should convert underscore-separated text', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle multiple words', () => {
      expect(toCamelCase('the quick brown fox')).toBe('theQuickBrownFox');
    });

    it('should handle mixed case input', () => {
      expect(toCamelCase('Hello World')).toBe('helloWorld');
    });
  });

  // ============================================================================
  // toPascalCase
  // ============================================================================
  describe('toPascalCase', () => {
    it('should convert text to PascalCase', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
    });

    it('should handle hyphenated text', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
    });

    it('should handle single word', () => {
      expect(toPascalCase('hello')).toBe('Hello');
    });
  });

  // ============================================================================
  // toSnakeCase
  // ============================================================================
  describe('toSnakeCase', () => {
    it('should convert camelCase', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
    });

    it('should convert PascalCase', () => {
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    it('should handle spaces', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
    });

    it('should handle multiple consecutive uppercase', () => {
      expect(toSnakeCase('myHTTPServer')).toBe('my_h_t_t_p_server');
    });
  });

  // ============================================================================
  // toKebabCase
  // ============================================================================
  describe('toKebabCase', () => {
    it('should convert camelCase', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('should convert PascalCase', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should handle spaces', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
    });
  });

  // ============================================================================
  // padLeft / padRight
  // ============================================================================
  describe('padLeft', () => {
    it('should pad string on left', () => {
      expect(padLeft('5', 3, '0')).toBe('005');
    });

    it('should use default space character', () => {
      expect(padLeft('hi', 5)).toBe('   hi');
    });

    it('should not pad if already at length', () => {
      expect(padLeft('hello', 5, '0')).toBe('hello');
    });
  });

  describe('padRight', () => {
    it('should pad string on right', () => {
      expect(padRight('5', 3, '0')).toBe('500');
    });

    it('should use default space character', () => {
      expect(padRight('hi', 5)).toBe('hi   ');
    });

    it('should not pad if already at length', () => {
      expect(padRight('hello', 5, '0')).toBe('hello');
    });
  });

  // ============================================================================
  // getInitials
  // ============================================================================
  describe('getInitials', () => {
    it('should get initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should limit to maxLength', () => {
      expect(getInitials('John Michael Doe', 2)).toBe('JM');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should handle more than maxLength words', () => {
      expect(getInitials('John Michael William Doe', 3)).toBe('JMW');
    });

    it('should uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });
  });

  // ============================================================================
  // escapeHtml / unescapeHtml
  // ============================================================================
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape angle brackets', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should handle multiple entities', () => {
      expect(escapeHtml('<p class="test">Hello & Goodbye</p>')).toBe(
        '&lt;p class=&quot;test&quot;&gt;Hello &amp; Goodbye&lt;/p&gt;'
      );
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape ampersand', () => {
      expect(unescapeHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
    });

    it('should unescape angle brackets', () => {
      expect(unescapeHtml('&lt;script&gt;')).toBe('<script>');
    });

    it('should unescape quotes', () => {
      expect(unescapeHtml('&quot;hello&quot;')).toBe('"hello"');
    });

    it('should unescape single quotes', () => {
      expect(unescapeHtml('it&#39;s')).toBe("it's");
    });
  });

  // ============================================================================
  // countWords
  // ============================================================================
  describe('countWords', () => {
    it('should count words', () => {
      expect(countWords('hello world')).toBe(2);
    });

    it('should handle multiple spaces', () => {
      expect(countWords('hello   world')).toBe(2);
    });

    it('should handle leading/trailing spaces', () => {
      expect(countWords('  hello world  ')).toBe(2);
    });

    it('should return 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });

    it('should handle single word', () => {
      expect(countWords('hello')).toBe(1);
    });
  });

  // ============================================================================
  // extractNumbers / extractLetters
  // ============================================================================
  describe('extractNumbers', () => {
    it('should extract numbers only', () => {
      expect(extractNumbers('abc123def456')).toBe('123456');
    });

    it('should handle no numbers', () => {
      expect(extractNumbers('hello')).toBe('');
    });

    it('should handle only numbers', () => {
      expect(extractNumbers('12345')).toBe('12345');
    });

    it('should handle phone format', () => {
      expect(extractNumbers('+33 6 12 34 56 78')).toBe('33612345678');
    });
  });

  describe('extractLetters', () => {
    it('should extract letters only', () => {
      expect(extractLetters('abc123def456')).toBe('abcdef');
    });

    it('should handle no letters', () => {
      expect(extractLetters('12345')).toBe('');
    });

    it('should handle only letters', () => {
      expect(extractLetters('hello')).toBe('hello');
    });

    it('should preserve case', () => {
      expect(extractLetters('Hello123World')).toBe('HelloWorld');
    });
  });

  // ============================================================================
  // reverseString / isPalindrome
  // ============================================================================
  describe('reverseString', () => {
    it('should reverse a string', () => {
      expect(reverseString('hello')).toBe('olleh');
    });

    it('should handle empty string', () => {
      expect(reverseString('')).toBe('');
    });

    it('should handle single character', () => {
      expect(reverseString('a')).toBe('a');
    });
  });

  describe('isPalindrome', () => {
    it('should detect palindrome', () => {
      expect(isPalindrome('radar')).toBe(true);
    });

    it('should ignore case', () => {
      expect(isPalindrome('Radar')).toBe(true);
    });

    it('should ignore spaces and punctuation', () => {
      expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true);
    });

    it('should detect non-palindrome', () => {
      expect(isPalindrome('hello')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isPalindrome('')).toBe(true);
    });
  });

  // ============================================================================
  // normalizeWhitespace
  // ============================================================================
  describe('normalizeWhitespace', () => {
    it('should replace multiple spaces with single space', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeWhitespace('')).toBe('');
    });
  });

  // ============================================================================
  // hashCode
  // ============================================================================
  describe('hashCode', () => {
    it('should generate consistent hash for same string', () => {
      const hash1 = hashCode('hello');
      const hash2 = hashCode('hello');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different strings', () => {
      const hash1 = hashCode('hello');
      const hash2 = hashCode('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should return number', () => {
      expect(typeof hashCode('test')).toBe('number');
    });

    it('should handle empty string', () => {
      expect(hashCode('')).toBe(0);
    });
  });

  // ============================================================================
  // highlightSearchTerm
  // ============================================================================
  describe('highlightSearchTerm', () => {
    it('should wrap search term with mark tag', () => {
      expect(highlightSearchTerm('Hello World', 'World')).toBe('Hello <mark>World</mark>');
    });

    it('should be case insensitive', () => {
      expect(highlightSearchTerm('Hello World', 'world')).toBe('Hello <mark>World</mark>');
    });

    it('should highlight multiple occurrences', () => {
      expect(highlightSearchTerm('Hello World World', 'World')).toBe(
        'Hello <mark>World</mark> <mark>World</mark>'
      );
    });

    it('should use custom tag', () => {
      expect(highlightSearchTerm('Hello World', 'World', 'strong')).toBe(
        'Hello <strong>World</strong>'
      );
    });

    it('should return original text if no search term', () => {
      expect(highlightSearchTerm('Hello World', '')).toBe('Hello World');
    });
  });

  // ============================================================================
  // escapeRegex
  // ============================================================================
  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('hello.world')).toBe('hello\\.world');
    });

    it('should escape multiple special characters', () => {
      expect(escapeRegex('[test]')).toBe('\\[test\\]');
      expect(escapeRegex('(a|b)')).toBe('\\(a\\|b\\)');
    });

    it('should escape asterisk and plus', () => {
      expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
    });

    it('should handle no special characters', () => {
      expect(escapeRegex('hello')).toBe('hello');
    });
  });
});
