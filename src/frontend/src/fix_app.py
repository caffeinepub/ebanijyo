import re

with open("App.tsx", "r") as f:
    content = f.read()

# Fix 1: formatPrice template literal
content = content.replace(
    'return "৳ " + bdtAmount.toLocaleString("en-BD");',
    'return `৳ ${bdtAmount.toLocaleString("en-BD")}`;'
)

# Fix 2: href="#" -> href="/"
content = content.replace('href="#"', 'href="/"')

# Fix 3: Add type="button" to raw <button elements (not Button component)
# Find all <button without type=
content = re.sub(r'<button\n(\s+)(?!type=)', r'<button\n\1type="button"\n\1', content)
content = re.sub(r'<button\s+(?!type=)(?!key=)(className=)', r'<button type="button" \1', content)
content = re.sub(r'<button\s+(?!type=)(key=)', r'<button type="button" \1', content)

# Fix 4: noArrayIndexKey for stars - use `star-${i}`
content = content.replace(
    '[...Array(5)].map((_, i) => (\n                      <Star\n                        key={i}',
    '[...Array(5)].map((_, i) => (\n                      <Star\n                        key={`star-${i}`}'
)

# Fix 5: Dropzone div - add keyboard handler
content = content.replace(
    'onClick={() => fileInputRef.current?.click()}\n            data-ocid="prescription.dropzone"',
    'onClick={() => fileInputRef.current?.click()}\n            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}\n            tabIndex={0}\n            role="button"\n            data-ocid="prescription.dropzone"'
)

with open("App.tsx", "w") as f:
    f.write(content)

print("Done")
