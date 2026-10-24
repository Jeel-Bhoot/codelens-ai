/**
 * Seed workspace.
 *
 * Deliberately flawed code so the reviewer has something real to find on a
 * first visit: an index key, a missing effect cleanup, an unlabelled icon
 * button, a div with a click handler, dangerouslySetInnerHTML, a hardcoded
 * token, target="_blank" without rel, loose equality, and a fetch with no
 * error state or abort. Every one of these is a finding a real reviewer
 * would raise.
 */

const PRODUCT_LIST = `import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';

const API_TOKEN = "YOUR_API_TOKEN_HERE";

export default function ProductList({ category, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [favourites, setFavourites] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    fetch('/api/products?category=' + category, {
      headers: { Authorization: 'Bearer ' + API_TOKEN },
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.items));
  }, [category]);

  // Keep a running count of what is on screen.
  useEffect(() => {
    setVisibleCount(products.filter((p) => p.name.includes(query)).length);
  });

  useEffect(() => {
    window.addEventListener('resize', handleResize);
  }, []);

  function handleResize() {
    console.log('viewport resized', window.innerWidth);
  }

  function toggleFavourite(id) {
    favourites.push(id);
    setFavourites(favourites);
  }

  const visible = products
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .map((p) => ({ ...p, priceLabel: '$' + parseInt(p.price) }));

  return (
    <section className="product-list">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products"
      />

      <p>{visibleCount} results</p>

      <ul>
        {visible.map((product, index) => (
          <li key={index} style={{ padding: 12 }}>
            <img src={product.image} />

            <div onClick={() => onAddToCart(product)}>
              <h3>{product.name}</h3>
              <span>{product.priceLabel}</span>
            </div>

            <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />

            <button onClick={() => toggleFavourite(product.id)}>
              <Heart />
            </button>

            <a href={product.vendorUrl} target="_blank">
              Visit vendor
            </a>

            {product.stock == 0 && <em>Out of stock</em>}
          </li>
        ))}
      </ul>

      <button onClick={() => onAddToCart(visible)}>
        <ShoppingCart />
      </button>
    </section>
  );
}
`;

const CHECKOUT_STYLES = `.checkout {
  display: block;
  position: relative;
}

.checkout__field input {
  border: 1px solid #d4d4d8;
  padding: 8px 10px;
  outline: none;
}

.checkout__field input:focus {
  border-color: #2563eb;
  outline: none;
}

/* TODO: replace once the design tokens land */
.checkout__error {
  color: #ef4444;
  font-size: 11px;
}

.checkout__submit {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: #2563eb;
  color: #ffffff;
  border: 0;
  padding: 10px 18px;
}

.checkout__submit:disabled {
  background: #93c5fd;
}
`;

export const SAMPLE_FILES = [
  { id: 'sample_product_list', name: 'ProductList.jsx', content: PRODUCT_LIST },
  { id: 'sample_checkout_css', name: 'checkout.css', content: CHECKOUT_STYLES },
];

export const EMPTY_FILE = {
  name: 'Untitled.jsx',
  content: `export default function Component() {\n  return <div>Paste your code here</div>;\n}\n`,
};
