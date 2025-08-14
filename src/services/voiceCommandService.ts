import { supabase } from "@/integrations/supabase/client";

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  summary?: string; // concise summary for TTS
  debug?: string;   // debug info for UI
}

// --- Expanded Malayalam Number Map and Parser ---
const malayalamNumberMap: Record<string, number> = {
  // Units
  "പൂജ്യം": 0, "ഒന്ന്": 1, "രണ്ട്": 2, "മൂന്ന്": 3, "നാല്": 4, "അഞ്ച്": 5, "ആറ്": 6, "ഏഴ്": 7, "എട്ട്": 8, "ഒമ്പത്": 9,
  // 10-19
  "പത്ത്": 10, "പതിനൊന്ന്": 11, "പന്ത്രണ്ട്": 12, "പതിമൂന്ന്": 13, "പതിനാല്": 14, "പതിനഞ്ച്": 15, "പതിനാറ്": 16, "പതിനേഴ്": 17, "പതിനെട്ട്": 18, "പത്തൊമ്പത്": 19,
  // Tens
  "ഇരുപത്": 20, "മുപ്പത്": 30, "നാല്പത്": 40, "അമ്പത്": 50, "അറുപത്": 60, "എഴുപത്": 70, "എൺപത്": 80, "തൊണ്ണൂറ്": 90,
  // Hundreds
  "നൂറ്": 100, "രണ്ടുനൂറ്": 200, "മുന്നൂറ്": 300, "നാനൂറ്": 400, "അഞ്ഞൂറ്": 500, "അറുനൂറ്": 600, "എഴുനൂറ്": 700, "എണ്ണൂറ്": 800, "തൊള്ളായിരം": 900,
  // Thousands
  "ആയിരം": 1000, "രണ്ടായിരം": 2000, "മുന്നായിരം": 3000, "നാലായിരം": 4000, "അയ്യായിരം": 5000, "അറായിരം": 6000, "ഏഴായിരം": 7000, "എട്ടായിരം": 8000, "ഒമ്പതായിരം": 9000,
  // Ten thousands
  "പത്തായിരം": 10000, "ഇരുപത്തായിരം": 20000, "മുപ്പത്തായിരം": 30000, "നാല്പത്തായിരം": 40000, "അമ്പത്തായിരം": 50000, "അറുപത്തായിരം": 60000, "എഴുപത്തായിരം": 70000, "എൺപത്തായിരം": 80000, "തൊണ്ണൂറായിരം": 90000,
  // Lakhs
  "ലക്ഷം": 100000, "രണ്ടുലക്ഷം": 200000, "മുന്നുലക്ഷം": 300000, "നാലുലക്ഷം": 400000, "അയ്യുലക്ഷം": 500000, "അറുലക്ഷം": 600000, "ഏഴുലക്ഷം": 700000, "എട്ടുലക്ഷം": 800000, "ഒമ്പതുലക്ഷം": 900000,
  // Ten lakhs
  "പത്ത് ലക്ഷം": 1000000, "ഇരുപത് ലക്ഷം": 2000000, "മുപ്പത് ലക്ഷം": 3000000, "നാല്പത് ലക്ഷം": 4000000, "അമ്പത് ലക്ഷം": 5000000, "അറുപത് ലക്ഷം": 6000000, "എഴുപത് ലക്ഷം": 7000000, "എൺപത് ലക്ഷം": 8000000, "തൊണ്ണൂറ് ലക്ഷം": 9000000,
  // Crores
  "കോടി": 10000000, "രണ്ടുകോടി": 20000000, "മുന്നുകോടി": 30000000, "നാലുകോടി": 40000000, "അയ്യുകോടി": 50000000, "അറുകോടി": 60000000, "ഏഴുകോടി": 70000000, "എട്ടുകോടി": 80000000, "ഒമ്പതുകോടി": 90000000,
  // Spoken forms
  "oru ayiram": 1000, "oru lakh": 100000, "oru kodi": 10000000, "pathu lakh": 1000000, "pathu kodi": 100000000,
  // Shopkeeper phrases
  "പുതിയ വരുമാനം": 0, "പോയത്": 0, "പുതിയ ചെലവ്": 0, "പുതിയ വാങ്ങൽ": 0, "പുതിയ കടം": 0
};

function parseMalayalamCompoundNumber(phrase: string): number | null {
  // Try direct match
  if (malayalamNumberMap[phrase]) return malayalamNumberMap[phrase];
  // Try digit
  if (/^\d+$/.test(phrase)) return parseInt(phrase, 10);
  // Try compound (e.g., "രണ്ടു ലക്ഷം")
  let total = 0, current = 0;
  const words = phrase.split(' ');
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    let val = malayalamNumberMap[w];
    if (!val && i + 1 < words.length) {
      const compound = w + ' ' + words[i + 1];
      val = malayalamNumberMap[compound];
      if (val) i++;
    }
    if (val) {
      if ([100, 1000, 10000, 100000, 1000000, 10000000, 100000000].includes(val)) {
        if (current === 0) current = 1;
        current *= val;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }
  total += current;
  return total > 0 ? total : null;
}

const englishNumberMap: Record<string, number> = {
  "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "hundred": 100, "thousand": 1000, "lakh": 100000, "lac": 100000, "ten lakh": 1000000, "crore": 10000000, "one crore": 10000000
};
const malayalamScales = ["കോടി", "ലക്ഷം", "ആയിരം", "നൂറ്"];
const englishScales = ["crore", "lakh", "lac", "thousand", "hundred"];

export function universalNumberParser(phrase: string): number | null {
  phrase = phrase.toLowerCase().replace(/[,-]/g, ' ').replace(/\s+/g, ' ').trim();
  // 1. Try digit match
  const digitMatch = phrase.match(/\b\d{1,8}\b/);
  if (digitMatch) return parseInt(digitMatch[0], 10);
  // 2. Try Malayalam compound
  const mlNum = parseMalayalamCompoundNumber(phrase);
  if (mlNum !== null) return mlNum;
  // 3. Try English word/compound (existing logic)
  for (const [word, value] of Object.entries(englishNumberMap)) {
    if (phrase.includes(word)) return value;
  }
  // 4. Try compound parsing (existing logic)
  let total = 0, current = 0;
  const words = phrase.split(' ');
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    let val = malayalamNumberMap[w] || englishNumberMap[w];
    if (!val && i + 1 < words.length) {
      const compound = w + ' ' + words[i + 1];
      val = malayalamNumberMap[compound] || englishNumberMap[compound];
      if (val) i++;
    }
    if (val) {
      if ([100, 1000, 10000, 100000, 1000000, 10000000, 100000000].includes(val)) {
        if (current === 0) current = 1;
        current *= val;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }
  total += current;
  return total > 0 ? total : null;
}

// Example supplier list for fuzzy matching
const supplierList = [
  'ABC Traders', 'XYZ Suppliers', 'Mohan Stores', 'Sahai Distributors', 'Global Mart', 'Super Bazaar', 'Fresh Mart', 'Elite Suppliers', 'Prime Wholesale', 'Classic Traders'
];

// Add a list of common Malayalam supplier/borrower names for fuzzy matching
const malayalamNameList = [
  'രാജു', 'ബിനു', 'സുനിൽ', 'അനിൽ', 'ഷാജി', 'മനോജ്', 'സജീവ്', 'ബാബു', 'സുരേഷ്', 'വിനോദ്',
  'കൃഷ്ണൻ', 'മുരളി', 'ജയൻ', 'സന്തോഷ്', 'പ്രദീപ്', 'അജിത്', 'ബാലു', 'രമേശ്', 'സജു', 'വിജയ്',
  'അമൽ', 'അരുൺ', 'അനൂപ്', 'അനീഷ്', 'അനിൽകുമാർ', 'ബാലകൃഷ്ണൻ', 'ദിലീപ്', 'ഗിരീഷ്', 'ഹരീഷ്', 'ഇന്ദ്രജിത്',
  'ജയകുമാർ', 'ജയശങ്കർ', 'ജയചന്ദ്രൻ', 'ജയപ്രകാശ്', 'ജയരാജ്', 'ജയശ്രീ', 'ജയശ്രീ', 'ജയശ്രീ', 'ജയശ്രീ', 'ജയശ്രീ'
];

// Move cleanForNameExtraction above its first use
function cleanForNameExtraction(text: string, language: string): string {
  // Remove numbers and number words
  let cleaned = text.replace(/\d+/g, ' ');
  if (language === 'english') {
    cleaned = cleaned.replace(/zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lac|crore/gi, ' ');
    cleaned = cleaned.replace(/purchase|from|rupees|rs|amount|paid|for|add|supplier|buy/gi, ' ');
  } else {
    cleaned = cleaned.replace(/ഒന്ന്|രണ്ട്|മൂന്ന്|നാല്|അഞ്ച്|ആറ്|ഏഴ്|എട്ട്|ഒമ്പത്|പത്ത്|പതിനൊന്ന്|പന്ത്രണ്ട്|പതിമൂന്ന്|പതിനാല്|പതിനഞ്ച്|പതിനാറ്|പതിനേഴ്|പതിനെട്ട്|പത്തൊമ്പത്|ഇരുപത്|മുപ്പത്|നാല്പത്|അമ്പത്|അറുപത്|എഴുപത്|എൺപത്|തൊണ്ണൂറ്|നൂറ്|രണ്ടുനൂറ്|മുന്നൂറ്|നാനൂറ്|അഞ്ഞൂറ്|അറുനൂറ്|എഴുനൂറ്|എണ്ണൂറ്|തൊള്ളായിരം|ആയിരം|രണ്ടായിരം|മുന്നായിരം|നാലായിരം|അയ്യായിരം|അറായിരം|ഏഴായിരം|എട്ടായിരം|ഒമ്പതായിരം|പത്തായിരം|ഇരുപത്തായിരം|മുപ്പത്തായിരം|നാല്പത്തായിരം|അമ്പത്തായിരം|അറുപത്തായിരം|എഴുപത്തായിരം|എൺപത്തായിരം|തൊണ്ണൂറായിരം|ലക്ഷം|രണ്ടുലക്ഷം|മുന്നുലക്ഷം|നാലുലക്ഷം|അയ്യുലക്ഷം|അറുലക്ഷം|ഏഴുലക്ഷം|എട്ടുലക്ഷം|ഒമ്പതുലക്ഷം|പത്തുലക്ഷം/g, ' ');
    cleaned = cleaned.replace(/വാങ്ങൽ|നിന്ന്|ൽ|രൂപ|rs|rupees|ചെലവ്|വിതരണക്കാരൻ|വിതരണക്കാരി|വിതരണക്കാർ|വിതരണക്കാർക്ക്/g, ' ');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

// Define purchase state interface
interface PurchaseState {
  step: 'idle' | 'supplier' | 'total_amount' | 'amount_paid' | 'confirmation';
  supplierName: string;
  totalAmount: number | null;
  amountPaid: number | null;
  isEnglish: boolean;
}

export class VoiceCommandService {
  static async processCommand(command: string, language: string): Promise<VoiceCommandResult> {
    const lowerCommand = command.toLowerCase();
    const isEnglish = language === "english";
    
    try {
      // First try to extract amount using the universal parser
      let amount: number | null = universalNumberParser(lowerCommand);
      let amountText: string | null = null;
      
      // If amount not found, try to extract number words specifically
      if (amount === null) {
        // Try Malayalam number words if language is not English
        if (!isEnglish) {
          const malayalamNumberMatch = lowerCommand.match(/([\s\S]+?)\s*(രൂപ|rs|rupees|പൈസ|paise|പൈസ്സ)/i);
          if (malayalamNumberMatch && malayalamNumberMatch[1]) {
            amount = parseMalayalamCompoundNumber(malayalamNumberMatch[1].trim());
            if (amount !== null) {
              amountText = malayalamNumberMatch[1].trim();
            }
          }
        }
        
        // If still no amount, try to find any number in the command
        if (amount === null) {
          const numberMatch = lowerCommand.match(/\d+/);
          if (numberMatch) {
            amount = parseInt(numberMatch[0], 10);
            amountText = numberMatch[0];
          }
        }
      } else {
        // If amount was found, get the text that was used to represent it
        const numberWords = [...Object.keys(malayalamNumberMap), ...Object.keys(englishNumberMap)];
        for (const word of numberWords) {
          if (lowerCommand.includes(word)) {
            amountText = word;
            break;
          }
        }
        // If no matching word found, use the amount as string
        if (!amountText) {
          amountText = amount.toString();
        }
      }
      
      // Remove amount text from command for name extraction
      let commandWithoutAmount = lowerCommand;
      if (amountText) {
        commandWithoutAmount = commandWithoutAmount.replace(amountText, '').replace(/\s{2,}/g, ' ').trim();
      }
      // Pass commandWithoutAmount to handlers for name extraction
      // Income/Expense handlers don't use name, so pass original command
      if (lowerCommand.includes("income") || lowerCommand.includes("വരുമാനം")) {
        return await this.handleIncomeCommand(command, amount, lowerCommand, isEnglish, amountText);
      } else if (lowerCommand.includes("expense") || lowerCommand.includes("ചെലവ്")) {
        return await this.handleExpenseCommand(command, amount, lowerCommand, isEnglish, amountText);
      } else if (lowerCommand.includes("purchase") || lowerCommand.includes("വാങ്ങൽ")) {
        return await this.handlePurchaseCommand(command, amount, commandWithoutAmount, isEnglish, amountText);
      } else if (lowerCommand.includes("borrow") || lowerCommand.includes("കടം")) {
        return await this.handleBorrowCommand(command, amount, commandWithoutAmount, isEnglish, amountText);
      } else {
        return {
          success: true,
          message: isEnglish 
            ? "I can help you add income, expenses, purchases, and borrowing. Try commands like 'Add income 500' or 'Expense 200 for food'."
            : "വരുമാനം, ചെലവുകൾ, വാങ്ങലുകൾ, കടം എന്നിവ ചേർക്കാൻ ഞാൻ സഹായിക്കാം. '500 വരുമാനം ചേർക്കുക' അല്ലെങ്കിൽ 'ഭക്ഷണത്തിന് 200 ചെലവ്' പോലെ പറയുക.",
          summary: isEnglish ? "Try a command like 'Add income 500'." : "'500 വരുമാനം ചേർക്കുക' എന്ന് ശ്രമിക്കുക."
        };
      }
    } catch (error) {
      console.error('Error processing voice command:', error);
      return {
        success: false,
        message: isEnglish 
          ? "Sorry, there was an error processing your request. Please try again."
          : "ക്ഷമിക്കണം, നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നതിൽ പിശക്. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
        summary: isEnglish ? "Error processing request." : "അഭ്യർത്ഥനയിൽ പിശക്." 
      };
    }
  }

  private static async handleIncomeCommand(command: string, amount: number | null, lowerCommand: string, isEnglish: boolean, amountText?: string): Promise<VoiceCommandResult> {
    if (amount) {
      const category = lowerCommand.includes("sales") || lowerCommand.includes("വിൽപന") ? (isEnglish ? "Sales" : "വിൽപന") :
                      lowerCommand.includes("service") || lowerCommand.includes("സേവനം") ? (isEnglish ? "Service" : "സേവനം") :
                      lowerCommand.includes("investment") || lowerCommand.includes("നിക്ഷേപം") ? (isEnglish ? "Investment" : "നിക്ഷേപം") :
                      (isEnglish ? "Other" : "മറ്റുള്ളവ");
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          type: 'income',
          amount: amount,
          category: category,
          description: `Added via voice: ${command}`,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;
      
      return {
        success: true,
        message: isEnglish 
          ? `Successfully added income of ₹${amount} in ${category} category.`
          : `₹${amount} വരുമാനം ${category} വിഭാഗത്തിൽ വിജയകരമായി ചേർത്തു.`,
        summary: isEnglish ? `Income: ₹${amount} (${category})` : `വരുമാനം: ₹${amount} (${category})`
      };
    } else {
      amountText = amountText || '';
      return {
        success: false,
        message: isEnglish 
          ? "Could not recognize the amount. Please say the number clearly or enter it manually."
          : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി തുക വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈമാറുക.",
        summary: isEnglish ? "Amount not recognized." : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല.",
        debug: `transcript: ${command}, extracted amount: ${amountText}`
      };
    }
  }

  private static async handleExpenseCommand(command: string, amount: number | null, lowerCommand: string, isEnglish: boolean, amountText?: string): Promise<VoiceCommandResult> {
    if (amount) {
      const category = lowerCommand.includes("travel") || lowerCommand.includes("യാത്ര") ? (isEnglish ? "Travel" : "യാത്ര") :
                      lowerCommand.includes("food") || lowerCommand.includes("ഭക്ഷണം") ? (isEnglish ? "Food" : "ഭക്ഷണം") :
                      lowerCommand.includes("utilities") || lowerCommand.includes("യൂട്ടിലിറ്റി") ? (isEnglish ? "Utilities" : "യൂട്ടിലിറ്റി") :
                      lowerCommand.includes("supplies") || lowerCommand.includes("സാധനങ്ങൾ") ? (isEnglish ? "Supplies" : "സാധനങ്ങൾ") :
                      (isEnglish ? "Other" : "മറ്റുള്ളവ");
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: amount,
          category: category,
          description: `Added via voice: ${command}`,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });

      if (error) throw error;
      
      return {
        success: true,
        message: isEnglish 
          ? `Successfully added expense of ₹${amount} in ${category} category.`
          : `₹${amount} ചെലവ് ${category} വിഭാഗത്തിൽ വിജയകരമായി ചേർത്തു.`,
        summary: isEnglish ? `Expense: ₹${amount} (${category})` : `ചെലവ്: ₹${amount} (${category})`
      };
    } else {
      amountText = amountText || '';
      return {
        success: false,
        message: isEnglish 
          ? "Could not recognize the amount. Please say the number clearly or enter it manually."
          : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി തുക വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈയാൽ നൽകുക.",
        summary: isEnglish ? "Amount not recognized." : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല.",
        debug: `transcript: ${command}, extracted amount: ${amountText}`
      };
    }
  }

  private static purchaseState: PurchaseState = {
    step: 'idle',
    supplierName: '',
    totalAmount: null,
    amountPaid: null,
    isEnglish: true
  };

  private static resetPurchaseState(): void {
    this.purchaseState = {
      step: 'idle',
      supplierName: '',
      totalAmount: null,
      amountPaid: null,
      isEnglish: this.purchaseState.isEnglish
    };
  }

  private static async handlePurchaseCommand(command: string, amount: number | null, lowerCommand: string, isEnglish: boolean, amountText?: string): Promise<VoiceCommandResult> {
    // If this is a fresh purchase command, start the flow
    if (this.purchaseState.step === 'idle') {
      this.purchaseState = {
        step: 'supplier',
        supplierName: '',
        totalAmount: null,
        amountPaid: null,
        isEnglish
      };
      return {
        success: true,
        message: isEnglish 
          ? "Please say the supplier's name." 
          : "ദയവായി വിതരണക്കാരന്റെ പേര് പറയുക.",
        summary: isEnglish ? "Supplier name?" : "വിതരണക്കാരന്റെ പേര്?",
        debug: `Starting purchase flow. Step: supplier`
      };
    }
    
    // Handle supplier name step
    if (this.purchaseState.step === 'supplier') {
      const supplierName = cleanForNameExtraction(command, isEnglish ? 'english' : 'malayalam') || command.trim();
      
      if (!supplierName || supplierName.length < 2) {
        return {
          success: false,
          message: isEnglish 
            ? "I couldn't recognize the supplier name. Please try again." 
            : "വിതരണക്കാരന്റെ പേര് തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
          summary: isEnglish ? "Invalid name" : "അസാധുവായ പേര്"
        };
      }

      this.purchaseState.supplierName = supplierName;
      this.purchaseState.step = 'total_amount';
      
      return {
        success: true,
        message: isEnglish 
          ? `Supplier set to ${supplierName}. What is the total amount?` 
          : `${supplierName} എന്നതായി സജ്ജമാക്കി. ആകെ തുക എത്ര?`,
        summary: isEnglish ? "Total amount?" : "ആകെ തുക?",
        debug: `Supplier: ${supplierName}, moving to total amount step`
      };
    }
    
    // Handle total amount step
    if (this.purchaseState.step === 'total_amount') {
      if (!amount || isNaN(amount) || amount <= 0) {
        return {
          success: false,
          message: isEnglish
            ? "Please provide a valid total amount."
            : "ദയവായി ഒരു സാധുവായ ആകെ തുക നൽകുക.",
          summary: isEnglish ? "Invalid amount" : "അസാധുവായ തുക"
        };
      }

      this.purchaseState.totalAmount = amount;
      this.purchaseState.step = 'amount_paid';
      
      return {
        success: true,
        message: isEnglish
          ? `Total amount set to ₹${amount}. How much are you paying now?`
          : `ആകെ തുക ₹${amount} എന്ന് സജ്ജമാക്കി. എത്ര തുക നൽകുന്നു?`,
        summary: isEnglish ? "Amount paid?" : "നൽകിയ തുക?",
        debug: `Total amount: ${amount}, moving to amount paid step`
      };
    }
    
    // Handle amount paid step
    if (this.purchaseState.step === 'amount_paid') {
      if (!amount || isNaN(amount) || amount <= 0) {
        return {
          success: false,
          message: isEnglish
            ? "Please provide a valid amount paid."
            : "ദയവായി ഒരു സാധുവായ തുക നൽകുക.",
          summary: isEnglish ? "Invalid amount" : "അസാധുവായ തുക"
        };
      }

      if (this.purchaseState.totalAmount && amount > this.purchaseState.totalAmount) {
        return {
          success: false,
          message: isEnglish
            ? `Amount paid (₹${amount}) cannot be more than total amount (₹${this.purchaseState.totalAmount}). Please try again.`
            : `നൽകിയ തുക (₹${amount}) ആകെ തുകയെക്കാൾ (₹${this.purchaseState.totalAmount}) കൂടുതലാകാൻ കഴിയില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.`,
          summary: isEnglish ? "Amount too high" : "തുക വളരെ കൂടുതലാണ്"
        };
      }

      this.purchaseState.amountPaid = amount;
      this.purchaseState.step = 'confirmation';
      
      const balance = (this.purchaseState.totalAmount || 0) - amount;
      
      return {
        success: true,
        message: isEnglish
          ? `You're paying ₹${amount} of ₹${this.purchaseState.totalAmount}. Balance will be ₹${balance}. Confirm to save?`
          : `നിങ്ങൾ ₹${this.purchaseState.totalAmount} ൽ ₹${amount} നൽകുന്നു. ബാക്കി ₹${balance}. സംരക്ഷിക്കാൻ സ്ഥിരീകരിക്കണോ?`,
        summary: isEnglish ? "Confirm?" : "സ്ഥിരീകരിക്കണോ?",
        debug: `Amount paid: ${amount}, moving to confirmation step`
      };
    }
    
    // Handle confirmation step
    if (this.purchaseState.step === 'confirmation') {
      const confirmKeywords = isEnglish 
        ? ['yes', 'confirm', 'save', 'ok', 'correct']
        : ['ശരിയാണ്', 'ശരി', 'അതെ', 'അതേ', 'സേവ്', 'ശരിയാണ്'];
      
      const cancelKeywords = isEnglish 
        ? ['no', 'cancel', 'wrong', 'stop', 'exit']
        : ['ഇല്ല', 'റദ്ദാക്കുക', 'തെറ്റാണ്', 'നിർത്തുക', 'പുറത്ത്'];
      
      const lowerCmd = command.toLowerCase();
      const isConfirmed = confirmKeywords.some(keyword => lowerCmd.includes(keyword));
      const isCancelled = cancelKeywords.some(keyword => lowerCmd.includes(keyword));
      
      if (!isConfirmed && !isCancelled) {
        return {
          success: false,
          message: isEnglish
            ? "Please say 'confirm' to save or 'cancel' to start over."
            : "സംരക്ഷിക്കാൻ 'ശരി' അല്ലെങ്കിൽ റദ്ദാക്കാൻ 'ഇല്ല' പറയുക.",
          summary: isEnglish ? "Confirm or cancel?" : "സ്ഥിരീകരിക്കണോ റദ്ദാക്കണോ?"
        };
      }
      
      if (isCancelled) {
        this.resetPurchaseState();
        return {
          success: true,
          message: isEnglish 
            ? "Purchase cancelled. You can start over." 
            : "വാങ്ങൽ റദ്ദാക്കി. നിങ്ങൾക്ക് വീണ്ടും ആരംഭിക്കാം.",
          summary: isEnglish ? "Cancelled" : "റദ്ദാക്കി",
          debug: "Purchase flow cancelled by user"
        };
      }
      
      // Save the purchase to database
      try {
        console.log('Starting purchase save...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          const errorMsg = 'User not authenticated';
          console.error(errorMsg, { sessionError, hasSession: !!session });
          throw new Error(isEnglish ? errorMsg : "ഉപയോക്താവ് പ്രവേശിച്ചിട്ടില്ല");
        }
        
        const user = session.user;
        const supplierName = this.purchaseState.supplierName;
        const totalAmount = this.purchaseState.totalAmount || 0;
        const amountPaid = this.purchaseState.amountPaid || 0;
        const balance = totalAmount - amountPaid;
        
        console.log('Purchase data prepared:', {
          supplierName,
          totalAmount,
          amountPaid,
          balance,
          userId: user.id
        });
        
        // Insert purchase record
        console.log('Attempting to insert purchase record...');
        const purchaseData = {
          supplier_name: supplierName,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          balance: balance,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Purchase data being inserted:', JSON.stringify(purchaseData, null, 2));
        
        const { data: purchase, error: purchaseError } = await supabase
          .from('purchases')
          .insert(purchaseData)
          .select()
          .single();
          
        if (purchaseError) {
          console.error('Error inserting purchase:', purchaseError);
          throw purchaseError;
        }
        
        console.log('Purchase inserted successfully:', purchase);
        
        // Insert transaction record if amount paid is greater than 0
        if (amountPaid > 0) {
          console.log('Attempting to insert transaction record...');
          const txData = {
            user_id: user.id,
            type: 'expense',
            amount: amountPaid,
            category: 'purchase',
            description: `Purchase from ${supplierName}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('Transaction data being inserted:', JSON.stringify(txData, null, 2));
          
          const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert(txData)
            .select()
            .single();
            
          if (txError) {
            console.error('Error inserting transaction:', txError);
            throw txError;
          }
          
          console.log('Transaction inserted successfully:', tx);
        } else {
          console.log('No transaction created as amount paid is 0');
        }
        
        // Reset state
        this.resetPurchaseState();
        
        // Return success response
        return {
          success: true,
          message: isEnglish
            ? `Purchase from ${supplierName} for ₹${totalAmount} has been saved. ₹${amountPaid} paid, balance is ₹${balance}.`
            : `${supplierName} ൽ നിന്നുള്ള ₹${totalAmount} വാങ്ങൽ സംരക്ഷിച്ചു. ₹${amountPaid} നൽകി, ബാക്കി ₹${balance}.`,
          summary: isEnglish ? "Purchase saved" : "വാങ്ങൽ സംരക്ഷിച്ചു",
          debug: `Purchase saved: ${JSON.stringify(purchase)}`
        };
        
      } catch (error: any) {
        console.error('Error saving purchase:', error);
        this.resetPurchaseState();
        
        return {
          success: false,
          message: isEnglish
            ? "Failed to save purchase. Please try again."
            : "വാങ്ങൽ സംരക്ഷിക്കാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
          summary: isEnglish ? "Save failed" : "സംരക്ഷിക്കാൻ കഴിഞ്ഞില്ല",
          debug: `Error: ${error.message}`
        };
      }
    }
    // Input validation
    if (!amount || isNaN(amount) || amount <= 0) {
      const errorMessage = isEnglish
        ? amount ? "Please enter a valid positive amount." : "Amount not recognized. Please say the amount clearly or enter it manually."
        : amount ? "ദയവായി ഒരു സാധുവായ പോസിറ്റീവ് തുക നൽകുക." : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി തുക വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈമാറുക.";
      
      return {
        success: false,
        message: errorMessage,
        summary: isEnglish ? "Invalid amount" : "അസാധുവായ തുക",
        debug: `transcript: ${command}, extracted amount: ${amountText}`
      };
    }
    let supplierName = isEnglish ? "Unknown Supplier" : "അജ്ഞാത വിതരണക്കാരൻ";
    // Define commandWithoutAmount for name extraction
    let commandWithoutAmount = lowerCommand;
    if (amountText) {
      commandWithoutAmount = commandWithoutAmount.replace(amountText, '').replace(/\s{2,}/g, ' ').trim();
    }
    // In handlePurchaseCommand, after removing amountText, use cleanForNameExtraction for supplier name
    const cleanedForName = cleanForNameExtraction(commandWithoutAmount, isEnglish ? 'english' : 'malayalam');
    if (cleanedForName) {
      supplierName = cleanedForName;
    }
    // Fuzzy match against supplier list
    if (supplierName === "Unknown Supplier" || !supplierName.trim()) {
      const { default: Fuse } = await import('fuse.js');
      const fuse = new Fuse(supplierList, { includeScore: true, threshold: 0.4 });
      const fuzzy = fuse.search(command);
      if (fuzzy.length > 0 && fuzzy[0].score !== undefined && fuzzy[0].score < 0.4) {
        supplierName = fuzzy[0].item;
      }
    }
    // If still not found, use the whole transcript as supplier name
    if (!supplierName || supplierName === "Unknown Supplier" || supplierName.trim() === "") {
      supplierName = command.trim();
    }
    let fromMatch = lowerCommand.match(/from\s+([\w\s]+)/i);
    if (!fromMatch && !isEnglish) {
      fromMatch = lowerCommand.match(/([\w\s]+)(ൽ നിന്ന്|നിന്ന്)/i);
    }
    if (!fromMatch) {
      const words = lowerCommand.split(' ');
      const filtered = words.filter(w => isNaN(Number(w)) && !['purchase','വാങ്ങൽ','from','ൽ','നിന്ന്','രൂപ','rs','rupees'].includes(w));
      if (filtered.length > 0) {
        supplierName = filtered.slice(-3).join(' ');
      }
      if ((!supplierName || supplierName === "Unknown Supplier" || supplierName.trim() === "") && filtered.length > 0) {
        supplierName = filtered[0];
      }
    } else {
      supplierName = fromMatch[1].replace(/(രൂപ|rs|rupees)/g, '').trim();
    }
    // Fuzzy match fallback
    if (!supplierName || supplierName === "Unknown Supplier" || supplierName.trim() === "") {
      const { default: Fuse } = await import('fuse.js');
      const fuse = new Fuse(supplierList, { includeScore: true, threshold: 0.4 });
      const fuzzy = fuse.search(command);
      if (fuzzy.length > 0 && fuzzy[0].score !== undefined && fuzzy[0].score < 0.4) {
        supplierName = fuzzy[0].item;
      }
    }
    // If still not found, use the whole transcript as supplier name
    if (!supplierName || supplierName === "Unknown Supplier" || supplierName.trim() === "") {
      supplierName = command.trim();
    }
    if (!isEnglish) {
      // Try Malayalam-specific patterns
      let mlMatch = lowerCommand.match(/([\S]+)ൽ നിന്ന്/);
      if (!mlMatch) mlMatch = lowerCommand.match(/([\S]+) നിന്നു?/);
      if (!mlMatch) mlMatch = lowerCommand.match(/([\S]+) വിതരണക്കാരൻ/);
      if (mlMatch && mlMatch[1]) {
        supplierName = mlMatch[1].trim();
      }
      // Fuzzy match against Malayalam name list
      if (!supplierName || supplierName === "അജ്ഞാത വിതരണക്കാരൻ" || supplierName.trim() === "") {
        const { default: Fuse } = await import('fuse.js');
        const malayalamFuse = new Fuse(malayalamNameList, { includeScore: true, threshold: 0.4 });
        const fuzzy = malayalamFuse.search(command);
        if (fuzzy.length > 0 && fuzzy[0].score !== undefined && fuzzy[0].score < 0.4) {
          supplierName = fuzzy[0].item;
        }
      }
    }
    // Fallback: use last few non-number words
    if (!supplierName || supplierName === "Unknown Supplier" || supplierName === "അജ്ഞാത വിതരണക്കാരൻ" || supplierName.trim() === "") {
      const words = lowerCommand.split(' ');
      const filtered = words.filter(w => isNaN(Number(w)) && !['purchase','വാങ്ങൽ','from','ൽ','നിന്ന്','രൂപ','rs','rupees','വിതരണക്കാരൻ'].includes(w));
      if (filtered.length > 0) {
        supplierName = filtered.slice(-3).join(' ');
      }
      if ((!supplierName || supplierName === "Unknown Supplier" || supplierName === "അജ്ഞാത വിതരണക്കാരൻ" || supplierName.trim() === "") && filtered.length > 0) {
        supplierName = filtered[0];
      }
    }
    // Block saving and show warning if name is blank, 'അജ്ഞാത', or suspicious
    if (!supplierName || supplierName === "Unknown Supplier" || supplierName === "അജ്ഞാത വിതരണക്കാരൻ" || supplierName.trim() === "" || /unknown|blank|supplier|person|അജ്ഞാത/i.test(supplierName)) {
      return {
        success: false,
        message: isEnglish 
          ? "Supplier name not recognized. Please say the supplier name clearly or enter it manually."
          : "വിതരണക്കാരന്റെ പേര് തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി പേര് വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈമാറുക.",
        summary: isEnglish ? "Supplier name not recognized." : "വിതരണക്കാരന്റെ പേര് തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല.",
        debug: `transcript: ${command}, extracted supplier: ${supplierName}`
      };
    }

    console.log('=== Starting purchase process ===');
    const supabaseClient = supabase; // Use the imported supabase client
    
    try {
      // Get user session with better error handling
      console.log('Getting user session...');
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError || !session?.user) {
        const errorMsg = 'User not authenticated';
        console.error(errorMsg, { sessionError, session });
        return {
          success: false,
          message: isEnglish ? errorMsg : 'ഉപയോക്താവ് പ്രവേശിച്ചിട്ടില്ല',
          summary: isEnglish ? 'Authentication failed' : 'അധികാരപരിശോധന പരാജയപ്പെട്ടു',
          debug: `Session error: ${sessionError?.message || 'No session'}`
        };
      }
      
      const user = session.user;
      console.log('User authenticated:', { userId: user.id });

      console.log('Attempting to save purchase:', { supplierName, amount, userId: user.id });
      
      // Prepare purchase data
      const purchaseData = {
        supplier_name: supplierName,
        total_amount: amount,
        amount_paid: 0,
        balance: amount,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Attempting to save purchase:', purchaseData);
      
      // Start a transaction
      console.log('Starting database transaction...');
      
      // First insert into purchases table
      const { data: purchaseResult, error: purchaseError } = await supabaseClient
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError) {
        console.error('Purchase insertion failed:', {
          error: purchaseError,
          details: purchaseError.details,
          hint: purchaseError.hint,
          code: purchaseError.code,
          purchaseData
        });
        
        // Map error codes to user-friendly messages
        const errorMessages: Record<string, {en: string, ml: string}> = {
          '23505': { 
            en: 'This purchase already exists',
            ml: 'ഈ വാങ്ങൽ ഇതിനകം നിലവിലുണ്ട്'
          },
          '23503': { 
            en: 'Invalid user or reference',
            ml: 'അസാധുവായ ഉപയോക്താവ് അല്ലെങ്കിൽ റഫറൻസ്'
          },
          '23514': {
            en: 'Invalid purchase data',
            ml: 'അസാധുവായ വാങ്ങൽ ഡാറ്റ'
          },
          '22P02': {
            en: 'Invalid data format',
            ml: 'അസാധുവായ ഡാറ്റ ഫോർമാറ്റ്'
          },
          '22001': {
            en: 'Data too long for column',
            ml: 'ഡാറ്റ വളരെ നീളമുള്ളതാണ്'
          },
          '22003': {
            en: 'Numeric value out of range',
            ml: 'സംഖ്യാ മൂല്യം പരിധിയിൽ ഇല്ല'
          },
          '23000': {
            en: 'Database error occurred',
            ml: 'ഡാറ്റാബേസിൽ പിശക് സംഭവിച്ചു'
          },
          '23502': {
            en: 'Required field is missing',
            ml: 'ആവശ്യമായ ഫീൽഡ് ശൂന്യമാണ്'
          }
        };
        
        // Get the error message or use a default one
        const errorInfo = errorMessages[purchaseError.code] || {
          en: 'Failed to save purchase',
          ml: 'വാങ്ങൽ സംരക്ഷിക്കാൻ കഴിഞ്ഞില്ല'
        };
        
        return {
          success: false,
          message: isEnglish ? errorInfo.en : errorInfo.ml,
          summary: isEnglish ? 'Save failed' : 'സംരക്ഷിക്കാൻ കഴിഞ്ഞില്ല',
          debug: `Purchase error: ${purchaseError.message} (Code: ${purchaseError.code})`
        };
      }
      
      console.log('Purchase saved successfully:', purchaseResult);
      
      // Then insert into transactions table
      console.log('Attempting to save transaction for purchase...');
      const transactionData = {
        type: 'expense',
        amount: amount,
        category: 'Purchase',
        description: `Purchase from ${supplierName} via voice`,
        user_id: user.id,
        purchase_id: purchaseResult.id, // Link to the purchase
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Transaction data:', transactionData);
      
      try {
        const { data: txData, error: txError } = await supabaseClient
          .from('transactions')
          .insert(transactionData)
          .select()
          .single();
          
        if (txError) {
          // If transaction fails, we should rollback the purchase
          console.error('Transaction insertion failed, rolling back purchase...');
          const { error: deleteError } = await supabaseClient
            .from('purchases')
            .delete()
            .eq('id', purchaseResult.id);
            
          if (deleteError) {
            console.error('Failed to rollback purchase after transaction failure:', deleteError);
          }
          
          throw txError;
        }
        
        console.log('Transaction saved successfully:', txData);
        
        // If we get here, both operations succeeded
        console.log('Purchase and transaction saved successfully');
        
      } catch (txError) {
        console.error('Transaction processing failed:', {
          error: txError,
          details: txError.details,
          hint: txError.hint,
          code: txError.code,
          transactionData
        });
        
        // Return error to user
        return {
          success: false,
          message: isEnglish
            ? 'Failed to record transaction. Please try again.'
            : 'ട്രാൻസാക്ഷൻ രേഖപ്പെടുത്താൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
          summary: isEnglish ? 'Transaction failed' : 'ട്രാൻസാക്ഷൻ പരാജയപ്പെട്ടു',
          debug: `Transaction error: ${txError.message} (Code: ${txError.code})`
        };
      }
      
      return {
        success: true,
        message: isEnglish 
          ? `Successfully recorded purchase of ₹${amount} from ${supplierName}.`
          : `${supplierName} ൽ നിന്ന് ₹${amount} വാങ്ങൽ വിജയകരമായി രേഖപ്പെടുത്തി.`,
        summary: isEnglish 
          ? `Purchase: ₹${amount} (${supplierName})` 
          : `വാങ്ങൽ: ₹${amount} (${supplierName})`,
        debug: `amount: ${amount}, supplier: ${supplierName}`
      };
    } catch (error) {
      console.error('Error in handlePurchaseCommand:', error);
      return {
        success: false,
        message: isEnglish
          ? `Failed to save purchase: ${error.message}`
          : `വാങ്ങൽ സംരക്ഷിക്കാൻ പരാജയപ്പെട്ടു: ${error.message}`,
        summary: isEnglish ? 'Purchase failed.' : 'വാങ്ങൽ പരാജയപ്പെട്ടു.',
        debug: `amount: ${amount}, supplier: ${supplierName}, error: ${error.message}`
      };
    }
  }

  private static async handleBorrowCommand(command: string, amount: number | null, lowerCommand: string, isEnglish: boolean, amountText?: string): Promise<VoiceCommandResult> {
    if (!amount || isNaN(amount)) {
      return {
        success: false,
        message: isEnglish 
          ? "Amount not recognized. Please say the amount clearly or enter it manually."
          : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി തുക വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈമാറുക.",
        summary: isEnglish ? "Amount not recognized." : "തുക തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല.",
        debug: `transcript: ${command}, extracted amount: ${amountText}`
      };
    }
    let borrowerName = isEnglish ? "Unknown Person" : "അജ്ഞാത വ്യക്തി";
    // Try compromise NLP for person extraction (English only)
    if (isEnglish) {
      const { default: nlp } = await import('compromise');
      const doc = nlp(command);
      const people = doc.people().out('array');
      if (people.length > 0) borrowerName = people[0];
    }
    let nameMatch = lowerCommand.match(/(?:to|from|give|gave)\s+([\w\s]+)/i);
    if (!nameMatch) {
      nameMatch = lowerCommand.match(/([\w\s]+)\s+borrowed/i);
    }
    if (!nameMatch && !isEnglish) {
      nameMatch = lowerCommand.match(/([\w\s]+)(ക്ക്|നു|കടം|വാങ്ങി)/i);
    }
    if (!nameMatch) {
      const words = lowerCommand.split(' ');
      const filtered = words.filter(w => isNaN(Number(w)) && !['borrow','കടം','from','to','give','gave','rupees','രൂപ','rs'].includes(w));
      if (filtered.length > 0) {
        borrowerName = filtered.slice(-3).join(' ');
      }
      if ((!borrowerName || borrowerName === "Unknown Person" || borrowerName.trim() === "") && filtered.length > 0) {
        borrowerName = filtered[0];
      }
    } else {
      borrowerName = nameMatch[1].replace(/(rupees|രൂപ|rs)/g, '').trim();
    }
    // In handleBorrowCommand, do the same for borrowerName
    let commandWithoutAmount = lowerCommand;
    if (amountText) {
      commandWithoutAmount = commandWithoutAmount.replace(amountText, '').replace(/\s{2,}/g, ' ').trim();
    }
    const cleanedForBorrower = cleanForNameExtraction(commandWithoutAmount, isEnglish ? 'english' : 'malayalam');
    if (cleanedForBorrower) {
      borrowerName = cleanedForBorrower;
    }
    // Fuzzy match fallback for borrowerName (optional, if you want to match against a people list)
    if (!borrowerName || borrowerName === "Unknown Person" || borrowerName.trim() === "") {
      const { default: Fuse } = await import('fuse.js');
      const fuse = new Fuse(supplierList, { includeScore: true, threshold: 0.4 });
      const fuzzy = fuse.search(command);
      if (fuzzy.length > 0 && fuzzy[0].score !== undefined && fuzzy[0].score < 0.4) {
        borrowerName = fuzzy[0].item;
      }
    }
    // If still not found, use the whole transcript as borrower name
    if (!borrowerName || borrowerName === "Unknown Person" || borrowerName.trim() === "") {
      borrowerName = command.trim();
    }
    if (!isEnglish) {
      // Try Malayalam-specific patterns
      let mlMatch = lowerCommand.match(/([\S]+) വിതരണക്കാരൻ/);
      if (!mlMatch) mlMatch = lowerCommand.match(/([\S]+) വിതരണക്കാരി/);
      if (!mlMatch) mlMatch = lowerCommand.match(/([\S]+) വിതരണക്കാർ/);
      if (mlMatch && mlMatch[1]) {
        borrowerName = mlMatch[1].trim();
      }
      // Fuzzy match against Malayalam name list
      if (!borrowerName || borrowerName === "അജ്ഞാത വ്യക്തി" || borrowerName.trim() === "") {
        const { default: Fuse } = await import('fuse.js');
        const malayalamFuse = new Fuse(malayalamNameList, { includeScore: true, threshold: 0.4 });
        const fuzzy = malayalamFuse.search(command);
        if (fuzzy.length > 0 && fuzzy[0].score !== undefined && fuzzy[0].score < 0.4) {
          borrowerName = fuzzy[0].item;
        }
      }
    }
    // Fallback: use last few non-number words
    if (!borrowerName || borrowerName === "അജ്ഞാത വ്യക്തി" || borrowerName.trim() === "") {
      const words = lowerCommand.split(' ');
      const filtered = words.filter(w => isNaN(Number(w)) && !['borrow','കടം','from','to','give','gave','rupees','രൂപ','rs','വിതരണക്കാരൻ'].includes(w));
      if (filtered.length > 0) {
        borrowerName = filtered.slice(-3).join(' ');
      }
      if ((!borrowerName || borrowerName === "അജ്ഞാത വ്യക്തി" || borrowerName.trim() === "") && filtered.length > 0) {
        borrowerName = filtered[0];
      }
    }
    // Block saving and show warning if name is blank, 'അജ്ഞാത', or suspicious
    if (!borrowerName || borrowerName === "അജ്ഞാത വ്യക്തി" || borrowerName.trim() === "" || /unknown|blank|supplier|person|അജ്ഞാത/i.test(borrowerName)) {
      return {
        success: false,
        message: isEnglish 
          ? "Borrower name not recognized. Please say the name clearly or enter it manually."
          : "വ്യക്തിയുടെ പേര് തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി പേര് വ്യക്തമായി പറയുക അല്ലെങ്കിൽ കൈയോടെ നൽകുക.",
        summary: isEnglish ? "Borrower name not recognized." : "വ്യക്തിയുടെ പേര് തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല.",
        debug: `transcript: ${command}, extracted borrower: ${borrowerName}`
      };
    }

    try {
      // First insert into borrows table
      const { data: borrowData, error: borrowError } = await supabase
        .from('borrows')
        .insert({
          borrower_name: borrowerName,
          total_given: amount,
          amount_paid: 0,
          balance: amount,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single();

      if (borrowError) throw borrowError;
      
      // Then insert into transactions table
      const { error: txBorrowError } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          amount: amount,
          category: 'Borrow',
          description: `Borrow to ${borrowerName} via voice`,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });
        
      if (txBorrowError) {
        console.error('Transaction insertion error:', txBorrowError);
        // Don't fail the whole operation if transaction insert fails
        return {
          success: true, // Still return success since borrow was saved
          message: isEnglish
            ? `Borrow recorded but transaction not logged: ${txBorrowError.message}`
            : `കടം രേഖപ്പെടുത്തി, പക്ഷേ ഇടപാട് ലോഗ് ചെയ്യാൻ കഴിഞ്ഞില്ല: ${txBorrowError.message}`,
          summary: isEnglish 
            ? `Borrow: ₹${amount} (${borrowerName})` 
            : `കടം: ₹${amount} (${borrowerName})`,
          debug: `Borrow saved but transaction failed: ${txBorrowError.message}`
        };
      }
      
      return {
        success: true,
        message: isEnglish
          ? `Successfully recorded borrow of ₹${amount} to ${borrowerName}.`
          : `${borrowerName} ക്ക് ₹${amount} കടം നൽകിയത് വിജയകരമായി രേഖപ്പെടുത്തി.`,
        summary: isEnglish 
          ? `Borrow: ₹${amount} (${borrowerName})` 
          : `കടം: ₹${amount} (${borrowerName})`,
        debug: `amount: ${amount}, borrower: ${borrowerName}`
      };
    } catch (error) {
      console.error('Error in handleBorrowCommand:', error);
      return {
        success: false,
        message: isEnglish
          ? `Failed to save borrow: ${error.message}`
          : `കടം സംരക്ഷിക്കാൻ പരാജയപ്പെട്ടു: ${error.message}`,
        summary: isEnglish ? 'Borrow failed.' : 'കടം രേഖപ്പെടുത്താൻ കഴിഞ്ഞില്ല.',
        debug: `amount: ${amount}, borrower: ${borrowerName}, error: ${error.message}`
      };
    }
  }
}