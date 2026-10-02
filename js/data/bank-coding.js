/* Practice bank — CODING EVALUATION (original BSP content).
   Easy: one visible bug. Medium: security, boundary and semantic bugs. Hard: subtle loops,
   authorisation flaws, efficiency requirements, and correct code that must not be over-flagged. */
"use strict";
(()=>{
const CD=(id,d,user,code,ans,sig,model)=>qMulti("coding_evaluation",id,d,"Which issues does this AI-generated code have? Select all that apply.",{ user, code },CISSUES,ans,sig,model);
/* EASY */
CD("ce-e-1","easy","Python: return the largest number in a list.","def largest(nums):\n    return sorted(nums)[0]",[0,2],["smallest","ascending","max","empty"],"sorted() is ascending, so [0] is the smallest value; it also fails on an empty list. Use max(nums) and handle empty input.");
CD("ce-e-2","easy","JavaScript: return true if a string is empty.","function isEmpty(s) {\n  return s.length === 0;\n}",[5],["length","correct"],"Correct for strings, as the prompt specifies.");
CD("ce-e-3","easy","Python: return True if n is even.","def is_even(n):\n    return n % 2 == 1",[0],["odd","== 0"],"It returns True for odd numbers; it should be n % 2 == 0.");
CD("ce-e-4","easy","JavaScript: convert Celsius to Fahrenheit.","function toF(c) {\n  return c * 9 / 5 - 32;\n}",[0],["+ 32","formula"],"The formula is c × 9/5 + 32.");
CD("ce-e-5","easy","Python: count the vowels (a, e, i, o, u) in a lowercase string.","def vowels(s):\n    return sum(1 for ch in s if ch in 'aeiou')",[5],["correct","lowercase"],"Correct for the stated lowercase input.");
CD("ce-e-6","easy","JavaScript: return the last element of an array.","function last(arr) {\n  return arr[arr.length];\n}",[1],["length - 1","undefined"],"arr[arr.length] is one past the end; use arr[arr.length - 1].");
CD("ce-e-7","easy","Python: return the greeting 'Hello, <name>!'.","def greet(name):\n    return 'Hello, ' + name",[0],["exclamation","!"],"The required '!' is missing.");
CD("ce-e-8","easy","JavaScript: sum an array of numbers.","function sum(a) {\n  let t = 0;\n  for (let i = 0; i <= a.length; i++) t += a[i];\n  return t;\n}",[0,1],["<=","undefined","nan"],"i <= a.length adds undefined, so the result is NaN. Use i < a.length.");
CD("ce-e-9","easy","Python: average of a list of numbers.","def avg(xs):\n    return sum(xs) / len(xs)",[2],["empty","zerodivisionerror"],"Correct for non-empty lists, but it raises ZeroDivisionError on an empty list.");
CD("ce-e-10","easy","Python: check whether a string reads the same forwards and backwards.","def is_palindrome(s):\n    return s == s[::-1]",[5],["reverse","correct"],"Correct for the stated task.");
/* MEDIUM */
CD("ce-m-1","medium","Python: look up a user by name.","def get_user(name):\n    return db.execute(\"SELECT * FROM users WHERE name = '\" + name + \"'\")",[3],["sql injection","parameterised"],"String concatenation allows SQL injection; use a parameterised query.");
CD("ce-m-2","medium","JavaScript: reverse a string.","function rev(s) {\n  return s.split('').reverse();\n}",[0],["array","join"],"It returns an array, not a string; add .join('').");
CD("ce-m-3","medium","Python: find the index of a target in a large SORTED list efficiently.","def find(xs, t):\n    for i in range(len(xs)):\n        if xs[i] == t:\n            return i\n    return -1",[4],["binary search","log n","linear"],
  "It's correct but linear; for a large sorted list, binary search (O(log n)) is expected.");
CD("ce-m-4","medium","JavaScript: show the user's display name on the page.","document.getElementById('name').innerHTML = user.displayName;",[3],["xss","textcontent","innerhtml"],"Inserting user-controlled text with innerHTML allows script injection (XSS); use textContent.");
CD("ce-m-5","medium","Python: return the first n Fibonacci numbers.","def fib(n):\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq",[1],["n = 1","n = 0","two items"],"For n = 0 or 1 it still returns two numbers; return seq[:n].");
CD("ce-m-6","medium","Python: remove duplicates from a list, keeping the original order.","def dedupe(xs):\n    return list(set(xs))",[0],["order","set"],"set() does not preserve order; use dict.fromkeys(xs).");
CD("ce-m-7","medium","JavaScript: check whether n is between 1 and 10 inclusive.","function inRange(n) {\n  return n > 1 && n < 10;\n}",[1],["inclusive",">=","<="],"Inclusive bounds need >= 1 and <= 10.");
CD("ce-m-8","medium","Python: open a config file whose name the user supplies.","def load(filename):\n    return open('/app/config/' + filename).read()",[3],["path traversal","../","validate"],"A name like '../../etc/passwd' escapes the folder (path traversal). Validate or whitelist the name.");
CD("ce-m-9","medium","Python: count how often each word appears.","def freq(words):\n    counts = {}\n    for w in words:\n        counts[w] = counts.get(w, 0) + 1\n    return counts",[5],["correct","dict"],"Correct.");
CD("ce-m-10","medium","JavaScript: make an independent deep copy of an object.","function copy(obj) {\n  const c = obj;\n  return c;\n}",[0],["reference","same object","structuredClone"],"It returns the same reference, not a copy; use structuredClone(obj).");
/* HARD */
CD("ce-h-1","hard","Python: check whether n is prime.","def is_prime(n):\n    for i in range(2, n):\n        if n % i == 0:\n            return False\n    return True",[0,4],["0","1","negative","sqrt"],
  "It returns True for 0, 1 and negatives, and checks up to n instead of √n.");
CD("ce-h-2","hard","Python: split a list into chunks of size k (k ≥ 1).","def chunks(xs, k):\n    return [xs[i:i + k] for i in range(0, len(xs), k)]",[5],["correct","last chunk shorter"],"Correct for k ≥ 1; the last chunk may be shorter, which is expected.");
CD("ce-h-3","hard","JavaScript: check a login password.","if (input == user.password) {\n  login(user);\n}",[3],["plaintext","hash","timing"],"Passwords appear to be stored and compared in plaintext; store salted hashes and compare with a secure function.");
CD("ce-h-4","hard","Python: binary search returning the index of t in sorted xs, or -1.",
  "def bsearch(xs, t):\n    lo, hi = 0, len(xs)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if xs[mid] < t:\n            lo = mid\n        else:\n            hi = mid\n    return lo if lo < len(xs) and xs[lo] == t else -1",[0,1],
  ["lo = mid + 1","infinite loop","[1, 2]"],"lo = mid can loop forever (e.g. xs = [1, 2], t = 2). It should be lo = mid + 1.");
CD("ce-h-5","hard","Python: sum of squares of a list.","def sum_sq(xs):\n    return sum(x * x for x in xs)",[5],["correct","empty is 0"],"Correct, including returning 0 for an empty list.");
CD("ce-h-6","hard","Python: merge two sorted lists in LINEAR time.","def merge(a, b):\n    return sorted(a + b)",[4],["n log n","two pointers","linear"],"It's correct but O((n+m) log(n+m)); the requirement asks for a linear two-pointer merge.");
CD("ce-h-7","hard","Python: divide a by b, returning None when b is zero.","def safe_div(a, b):\n    return a / b if b else None",[5],["correct","0.0"],"Correct (0 and 0.0 are both falsy).");
CD("ce-h-8","hard","JavaScript (Express): return the LOGGED-IN user's orders.",
  "app.get('/orders/:id', (req, res) => {\n  db.query('SELECT * FROM orders WHERE user_id = $1', [req.params.id])\n    .then(rows => res.json(rows));\n});",[3],
  ["authorisation","session user","idor","any id"],"The query is parameterised, but it trusts the id from the URL, so anyone can read anyone's orders (an insecure direct object reference). Use the session's user id.");
CD("ce-h-9","hard","Python: read an age from a submitted form.","def get_age(form):\n    return int(form['age'])",[2],["keyerror","valueerror","validate"],"A missing or non-numeric field raises an error; validate input and handle missing values.");
CD("ce-h-10","hard","Python: return the most frequent element of a list.",
  "def most_common(xs):\n    best, count = None, 0\n    for x in xs:\n        c = xs.count(x)\n        if c > count:\n            best, count = x, c\n    return best",[4],["o(n²)","counter","count in loop"],
  "It's correct but O(n²) because xs.count runs inside the loop; collections.Counter is linear.");
})();
