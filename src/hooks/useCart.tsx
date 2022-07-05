import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);
      const { data } = await api.get(`/products/${productId}`);

      if (productExists) {
        const amountProduct = await api.get(`/stock/${productId}`);

        if (amountProduct.data.amount < productExists.amount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          setCart(
            cart.map((product) =>
              product.id === productId
                ? {
                    ...productExists,
                    amount:
                      product.amount === amountProduct.data.amount
                        ? product.amount
                        : product.amount + 1,
                  }
                : product
            )
          );
        }
      } else {
        const newProduct = {
          amount: 1,
          ...data,
        };
        const products = [...cart, newProduct];
        setCart(products);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productExists = cart.find((product) => product.id === productId);
      const { data } = await api.get(`/stock/${productId}`);

      if (productExists) {
        if (amount > data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          setCart(
            cart.map((product) =>
              product.id === productId
                ? {
                    ...productExists,
                    amount,
                  }
                : product
            )
          );
        }
      } else {
        toast.error("Produto não encontrado");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
