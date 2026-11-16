
import React, { useEffect, useMemo, useState } from "react";
import {
  Sandwich,
  CupSoda,
  CakeSlice,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  PackageCheck,
  Bell,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Trash2,
  Utensils,
  Pencil,
  Search,
  X,
  ClipboardList,
  Package,
  Save
} from "lucide-react";

const brl = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const statuses = {
  recebido: "Pedido recebido",
  preparo: "Em preparo",
  pronto: "Pronto para retirar",
  entregue: "Entregue"
};

const emptyProduct = {
  id: null,
  name: "",
  description: "",
  price: "",
  stock: 0,
  active: true
};

function productIcon(name) {
  if (/suco|bebida/i.test(name)) return <CupSoda />;
  if (/bolo|doce/i.test(name)) return <CakeSlice />;
  return <Sandwich />;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data;
}

export default function App() {
  const [page, setPage] = useState("menu");

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  const [customerName, setCustomerName] = useState("");
  const [customerClass, setCustomerClass] = useState("");
  const [notes, setNotes] = useState("");

  const [pin, setPin] = useState("");
  const [staff, setStaff] = useState(
    sessionStorage.getItem("staffPin") || ""
  );

  const [staffTab, setStaffTab] = useState("orders");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      products
        .filter((product) => cart[product.id] > 0)
        .map((product) => ({
          ...product,
          quantity: cart[product.id]
        })),
    [products, cart]
  );

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const cartQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  function showError(message) {
    setError(message);
    setSuccess("");
  }

  function showSuccess(message) {
    setSuccess(message);
    setError("");
  }

  async function loadProducts(asStaff = false) {
    const options = asStaff && staff
      ? { headers: { "x-staff-pin": staff } }
      : {};

    const data = await api("/api/products", options);
    setProducts(data.products || []);
  }

  async function loadOrders() {
    const data = await api("/api/orders", {
      headers: { "x-staff-pin": staff }
    });

    setOrders(data.orders || []);
  }

  useEffect(() => {
    loadProducts().catch((err) => showError(err.message));
  }, []);

  function changeQuantity(product, difference) {
    if (!product.active || product.stock <= 0) return;

    setCart((current) => {
      const updated = { ...current };

      const newQuantity = Math.max(
        0,
        Math.min(
          Number(product.stock),
          (updated[product.id] || 0) + difference
        )
      );

      if (newQuantity > 0) {
        updated[product.id] = newQuantity;
      } else {
        delete updated[product.id];
      }

      return updated;
    });
  }

  function removeFromCart(productId) {
    setCart((current) => {
      const updated = { ...current };
      delete updated[productId];
      return updated;
    });
  }

  async function submitOrder() {
    if (!customerName.trim()) {
      showError("Informe seu nome para identificar o pedido.");
      return;
    }

    if (!items.length) {
      showError("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerClass: customerClass.trim(),
          notes: notes.trim(),
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity
          }))
        })
      });

      setOrder(data.order);
      setCart({});
      setCustomerName("");
      setCustomerClass("");
      setNotes("");

      await loadProducts();
      setPage("track");
    } catch (err) {
      showError(err.message);
      loadProducts().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    setBusy(true);

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ pin })
      });

      setStaff(pin);
      sessionStorage.setItem("staffPin", pin);
      setPin("");
      setStaffTab("orders");
      setPage("staff");
      setError("");
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setStaff("");
    sessionStorage.removeItem("staffPin");
    setOrders([]);
    setPage("login");
    setStaffTab("orders");
  }

  async function updateStatus(id, newStatus) {
    try {
      await api(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "x-staff-pin": staff },
        body: JSON.stringify({ status: newStatus })
      });

      await loadOrders();
      showSuccess(`Pedido #${String(id).padStart(3, "0")} atualizado.`);
    } catch (err) {
      showError(err.message);
    }
  }

  async function trackByNumber(number) {
    if (!String(number).trim()) {
      showError("Digite o número do pedido.");
      return;
    }

    try {
      const data = await api(`/api/orders/${Number(number)}`);
      setOrder(data.order);
      setPage("track");
      setError("");
    } catch (err) {
      showError(err.message);
    }
  }

  function startNewProduct() {
    setProductForm({ ...emptyProduct });
    setEditingProduct(false);
    setError("");
    setSuccess("");
  }

  function startEditProduct(product) {
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      active: Boolean(product.active)
    });

    setEditingProduct(true);
    setError("");
    setSuccess("");
  }

  async function saveProduct(event) {
    event.preventDefault();

    const price = Number(productForm.price);
    const stock = Number(productForm.stock);

    if (!productForm.name.trim()) {
      showError("Informe o nome do produto.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showError("Informe um preço válido maior que zero.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      showError("O estoque deve ser um número inteiro igual ou maior que zero.");
      return;
    }

    setBusy(true);

    try {
      const body = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price,
        stock,
        active: productForm.active
      };

      if (editingProduct) {
        await api("/api/products", {
          method: "PATCH",
          headers: { "x-staff-pin": staff },
          body: JSON.stringify({
            id: productForm.id,
            ...body
          })
        });

        showSuccess("Produto atualizado com sucesso.");
      } else {
        await api("/api/products", {
          method: "POST",
          headers: { "x-staff-pin": staff },
          body: JSON.stringify(body)
        });

        showSuccess("Produto cadastrado com sucesso.");
      }

      setProductForm({ ...emptyProduct });
      setEditingProduct(false);
      await loadProducts(true);
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product) {
    try {
      await api("/api/products", {
        method: "PATCH",
        headers: { "x-staff-pin": staff },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: Number(product.price),
          stock: Number(product.stock),
          active: !product.active
        })
      });

      await loadProducts(true);
      showSuccess(
        product.active
          ? "Produto desativado."
          : "Produto ativado."
      );
    } catch (err) {
      showError(err.message);
    }
  }

  useEffect(() => {
    if (page !== "staff" || !staff) return;

    loadOrders().catch((err) => showError(err.message));
    loadProducts(true).catch((err) => showError(err.message));

    const timer = setInterval(() => {
      loadOrders().catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, [page, staff]);

  useEffect(() => {
    if (page !== "track" || !order?.id) return;

    const timer = setInterval(() => {
      api(`/api/orders/${order.id}`)
        .then((data) => setOrder(data.order))
        .catch(() => {});
    }, 4000);

    return () => clearInterval(timer);
  }, [page, order?.id]);

  const filteredOrders = orders.filter((item) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      String(item.orderNumber).toLowerCase().includes(searchText) ||
      String(item.customerName || "").toLowerCase().includes(searchText) ||
      String(item.customerClass || "").toLowerCase().includes(searchText);

    const matchesStatus =
      !filterStatus || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="site">
      <header>
        <a className="brand" onClick={() => setPage("menu")}>
          <Utensils /> Cantina<span>+</span>
        </a>

        <nav>
          <button onClick={() => setPage("menu")}>Cardápio</button>

          <button onClick={() => setPage("find")}>
            Acompanhar pedido
          </button>

          <button onClick={() => setPage(staff ? "staff" : "login")}>
            Painel da atendente
          </button>

          <button className="cart" onClick={() => setPage("review")}>
            <ShoppingCart /> {cartQuantity}
          </button>
        </nav>
      </header>

      <main>
        <aside>
          <small>● CANTINA ESCOLAR · PEDIDO ONLINE</small>

          <h1>
            Seu intervalo,
            <br />
            <em>mais leve.</em>
          </h1>

          <p>
            Escolha seus lanches com tranquilidade. Acompanhe
            o pedido e retire no balcão quando estiver pronto.
          </p>

          <div className="food-hero">🥪　🧃　🍰</div>
        </aside>

        <section className="panel">
          {error && (
            <div className="error">
              {error}
              <button onClick={() => setError("")}>
                <X />
              </button>
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess("")}>
                <X />
              </button>
            </div>
          )}

          {/* CARDÁPIO */}

          {page === "menu" && (
            <>
              <small>FEITO PARA O SEU INTERVALO</small>
              <h2>Cardápio de hoje</h2>

              <div className="grid">
                {products
                  .filter((product) => product.active)
                  .map((product) => (
                    <article className="product" key={product.id}>
                      <div className="food">
                        {productIcon(product.name)}
                      </div>

                      <div className="prodinfo">
                        <b>{product.name}</b>
                        <small>{product.description}</small>
                        <strong>{brl(product.price)}</strong>

                        <label className={product.stock > 0 ? "yes" : "no"}>
                          {product.stock > 0
                            ? `Disponível · ${product.stock} unidades`
                            : "Esgotado"}
                        </label>
                      </div>

                      <button
                        disabled={product.stock <= 0}
                        onClick={() => changeQuantity(product, 1)}
                        title="Adicionar ao carrinho"
                      >
                        <Plus />
                      </button>

                      {cart[product.id] > 0 && (
                        <i>{cart[product.id]}</i>
                      )}
                    </article>
                  ))}
              </div>

              <p className="hint">
                Pagamento presencial na retirada.
              </p>

              <button
                className="primary"
                onClick={() => setPage("review")}
              >
                Revisar pedido <ShoppingCart />
              </button>
            </>
          )}

          {/* REVISÃO DO PEDIDO */}

          {page === "review" && (
            <>
              <button className="back" onClick={() => setPage("menu")}>
                <ArrowLeft /> Voltar
              </button>

              <small>QUASE LÁ</small>
              <h2>Revise seu pedido</h2>

              {items.length === 0 ? (
                <p>Seu carrinho está vazio.</p>
              ) : (
                <>
                  {items.map((item) => (
                    <div className="line" key={item.id}>
                      <span>
                        {productIcon(item.name)}
                        {item.name}
                      </span>

                      <div>
                        <button
                          onClick={() => changeQuantity(item, -1)}
                        >
                          <Minus />
                        </button>

                        {item.quantity}

                        <button
                          disabled={item.quantity >= item.stock}
                          onClick={() => changeQuantity(item, 1)}
                        >
                          <Plus />
                        </button>
                      </div>

                      <b>{brl(item.price * item.quantity)}</b>

                      <button onClick={() => removeFromCart(item.id)}>
                        <Trash2 />
                      </button>
                    </div>
                  ))}

                  <h3>Total: {brl(total)}</h3>

                  <div className="customer-form">
                    <h3>Seus dados</h3>

                    <label htmlFor="customerName">
                      Nome completo *
                    </label>

                    <input
                      id="customerName"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(event.target.value)
                      }
                      placeholder="Digite seu nome"
                      maxLength={120}
                    />

                    <label htmlFor="customerClass">
                      Turma
                    </label>

                    <input
                      id="customerClass"
                      value={customerClass}
                      onChange={(event) =>
                        setCustomerClass(event.target.value)
                      }
                      placeholder="Ex.: 2º ano A"
                      maxLength={80}
                    />

                    <label htmlFor="notes">
                      Observações do pedido
                    </label>

                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Alguma observação? (opcional)"
                      maxLength={500}
                      rows={3}
                    />
                  </div>

                  <p className="hint">
                    Pagamento no balcão, no momento da retirada.
                  </p>

                  <button
                    className="primary"
                    disabled={busy}
                    onClick={submitOrder}
                  >
                    {busy ? "Enviando..." : "Confirmar pedido"}
                    <Check />
                  </button>
                </>
              )}
            </>
          )}

          {/* ACOMPANHAMENTO DO PEDIDO */}

          {page === "track" && order && (
            <>
              <button className="back" onClick={() => setPage("menu")}>
                <ArrowLeft /> Voltar
              </button>

              <div className="center">
                <PackageCheck />

                <small>PEDIDO REGISTRADO</small>

                <h2>Pedido #{order.orderNumber}</h2>

                <h3>{statuses[order.status] || order.status}</h3>

                <p>
                  {order.customerName
                    ? `Cliente: ${order.customerName}`
                    : "Guarde o número para retirar seu pedido."}
                </p>
              </div>

              <div className="timeline">
                {Object.entries(statuses).map(([key, value], index) => (
                  <div
                    className={
                      Object.keys(statuses).indexOf(order.status) >= index
                        ? "done"
                        : ""
                    }
                    key={key}
                  >
                    <Check />
                    {value}
                  </div>
                ))}
              </div>

              {order.items?.map((item, index) => (
                <p className="line" key={`${item.name}-${index}`}>
                  {item.quantity} × {item.name}
                  <b>{brl(item.lineTotal)}</b>
                </p>
              ))}

              <h3>Total: {brl(order.total)}</h3>

              {order.status === "pronto" && (
                <div className="ready">
                  <Bell /> Seu pedido está pronto! Retire no balcão.
                </div>
              )}

              {order.status === "entregue" && (
                <div className="ready">
                  Pedido entregue. Obrigado!
                </div>
              )}

              <small>Atualização automática a cada 4 segundos.</small>
            </>
          )}

          {/* BUSCAR PEDIDO */}

          {page === "find" && (
            <>
              <small>ACOMPANHAMENTO</small>
              <h2>Encontre seu pedido</h2>

              <Track onGo={trackByNumber} />
            </>
          )}

          {/* LOGIN DA ATENDENTE */}

          {page === "login" && (
            <>
              <small>ÁREA RESTRITA</small>
              <h2>Painel da atendente</h2>

              <p>Digite o PIN fornecido à equipe.</p>

              <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="PIN da atendente"
              />

              <button
                className="primary"
                disabled={busy}
                onClick={login}
              >
                {busy ? "Verificando..." : "Entrar"}
              </button>
            </>
          )}

          {/* PAINEL DA ATENDENTE */}

          {page === "staff" && (
            <>
              <small>GERENCIAMENTO</small>
              <h2>Painel da atendente</h2>

              <div className="staff-navigation">
                <button
                  className={staffTab === "orders" ? "selected" : ""}
                  onClick={() => setStaffTab("orders")}
                >
                  <ClipboardList /> Pedidos
                </button>

                <button
                  className={staffTab === "products" ? "selected" : ""}
                  onClick={() => setStaffTab("products")}
                >
                  <Package /> Produtos e estoque
                </button>

                <button onClick={logout}>
                  <LogOut /> Sair
                </button>
              </div>

              {staffTab === "orders" && (
                <>
                  <div className="tools">
                    <span>Pedidos atualizados automaticamente</span>

                    <button
                      onClick={() => loadOrders().catch((err) =>
                        showError(err.message)
                      )}
                      title="Atualizar pedidos"
                    >
                      <RefreshCw />
                    </button>
                  </div>

                  <div className="filters">
                    <div className="search-field">
                      <Search />

                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por nome, turma ou número"
                      />
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(event) =>
                        setFilterStatus(event.target.value)
                      }
                    >
                      <option value="">Todos os status</option>
                      <option value="recebido">Recebidos</option>
                      <option value="preparo">Em preparo</option>
                      <option value="pronto">Prontos</option>
                      <option value="entregue">Entregues</option>
                    </select>
                  </div>

                  {filteredOrders.length === 0 && (
                    <p>Nenhum pedido encontrado.</p>
                  )}

                  {filteredOrders.map((item) => (
                    <article className="staffcard" key={item.id}>
                      <div className="staff-order-heading">
                        <b>Pedido #{item.orderNumber}</b>
                        <label>{statuses[item.status]}</label>
                      </div>

                      <p>
                        <strong>Cliente:</strong>{" "}
                        {item.customerName || "Não informado"}
                      </p>

                      {item.customerClass && (
                        <p>
                          <strong>Turma:</strong> {item.customerClass}
                        </p>
                      )}

                      {item.items?.map((product, index) => (
                        <p key={`${product.name}-${index}`}>
                          {product.quantity} × {product.name}
                          {" — "}
                          {brl(product.lineTotal)}
                        </p>
                      ))}

                      {item.notes && (
                        <p>
                          <strong>Observações:</strong> {item.notes}
                        </p>
                      )}

                      <strong>Total: {brl(item.total)}</strong>

                      <div className="staff-actions">
                        {item.status === "recebido" && (
                          <button
                            onClick={() => updateStatus(item.id, "preparo")}
                          >
                            Iniciar preparo
                          </button>
                        )}

                        {item.status === "preparo" && (
                          <button
                            onClick={() => updateStatus(item.id, "pronto")}
                          >
                            Marcar como pronto
                          </button>
                        )}

                        {item.status === "pronto" && (
                          <button
                            onClick={() => updateStatus(item.id, "entregue")}
                          >
                            Marcar como entregue
                          </button>
                        )}

                        {item.status === "entregue" && (
                          <span>✓ Pedido entregue</span>
                        )}
                      </div>
                    </article>
                  ))}
                </>
              )}

              {/* CADASTRO E ESTOQUE DE PRODUTOS */}

              {staffTab === "products" && (
                <>
                  <div className="product-admin-heading">
                    <div>
                      <h3>Produtos cadastrados</h3>
                      <p>Gerencie preços, disponibilidade e estoque.</p>
                    </div>

                    <button
                      className="primary"
                      onClick={startNewProduct}
                    >
                      <Plus /> Novo produto
                    </button>
                  </div>

                  <form className="product-form" onSubmit={saveProduct}>
                    <h3>
                      {editingProduct
                        ? "Editar produto"
                        : "Cadastrar produto"}
                    </h3>

                    <label htmlFor="productName">
                      Nome do produto *
                    </label>

                    <input
                      id="productName"
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          name: event.target.value
                        })
                      }
                      placeholder="Ex.: Coxinha"
                      maxLength={120}
                      required
                    />

                    <label htmlFor="productDescription">
                      Descrição
                    </label>

                    <input
                      id="productDescription"
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          description: event.target.value
                        })
                      }
                      placeholder="Ex.: Coxinha de frango"
                      maxLength={255}
                    />

                    <div className="product-form-columns">
                      <div>
                        <label htmlFor="productPrice">
                          Preço (R$) *
                        </label>

                        <input
                          id="productPrice"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={productForm.price}
                          onChange={(event) =>
                            setProductForm({
                              ...productForm,
                              price: event.target.value
                            })
                          }
                          placeholder="Ex.: 6.50"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="productStock">
                          Quantidade em estoque *
                        </label>

                        <input
                          id="productStock"
                          type="number"
                          min="0"
                          step="1"
                          value={productForm.stock}
                          onChange={(event) =>
                            setProductForm({
                              ...productForm,
                              stock: event.target.value
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <label className="active-checkbox">
                      <input
                        type="checkbox"
                        checked={productForm.active}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            active: event.target.checked
                          })
                        }
                      />
                      Produto ativo no cardápio
                    </label>

                    <div className="form-buttons">
                      <button
                        className="primary"
                        type="submit"
                        disabled={busy}
                      >
                        <Save />
                        {busy ? "Salvando..." : "Salvar produto"}
                      </button>

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={startNewProduct}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>

                  <h3>Estoque atual</h3>

                  {products.map((product) => (
                    <article className="product-admin-card" key={product.id}>
                      <div className="food">
                        {productIcon(product.name)}
                      </div>

                      <div className="product-admin-info">
                        <b>{product.name}</b>
                        <small>{product.description}</small>
                        <strong>{brl(product.price)}</strong>

                        <span>
                          Estoque: {product.stock} unidades
                        </span>

                        <label className={product.active ? "yes" : "no"}>
                          {product.active ? "Ativo" : "Desativado"}
                        </label>
                      </div>

                      <div className="product-admin-actions">
                        <button
                          onClick={() => startEditProduct(product)}
                          title="Editar produto"
                        >
                          <Pencil />
                        </button>

                        <button
                          onClick={() => toggleProduct(product)}
                          title={
                            product.active
                              ? "Desativar produto"
                              : "Ativar produto"
                          }
                        >
                          {product.active ? <X /> : <Check />}
                        </button>
                      </div>
                    </article>
                  ))}
                </>
              )}
            </>
          )}
        </section>
      </main>

      <footer>
        © Cantina+ · Pedido online · Pagamento na retirada
      </footer>
    </div>
  );
}

function Track({ onGo }) {
  const [number, setNumber] = useState("");

  return (
    <div className="login">
      <p>
        Informe o número recebido após confirmar o pedido.
      </p>

      <input
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        placeholder="Ex.: 24"
        type="number"
        min="1"
      />

      <button
        className="primary"
        onClick={() => onGo(number)}
      >
        Acompanhar pedido
      </button>
    </div>
  );
}
