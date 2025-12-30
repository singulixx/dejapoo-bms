import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        items: [{ title: "Ringkasan", url: "/dashboard" }],
      },

      {
        title: "Master Data",
        icon: Icons.Alphabet,
        items: [
          { title: "Desain", url: "/products" },
        ],
      },

      {
        title: "Stok",
        icon: Icons.Table,
        items: [
          { title: "Stok Saat Ini", url: "/stocks" },
          { title: "Barang Masuk", url: "/stock-in" },
          { title: "Barang Keluar", url: "/stock-out" },
        ],
      },

      {
        title: "Penjualan",
        icon: Icons.PieChart,
        items: [
          { title: "POS Offline", url: "/pos" },
          { title: "Riwayat Penjualan", url: "/orders" },
        ],
      },


      {
        title: "Integrasi",
        icon: Icons.PieChart,
        items: [{ title: "Webhook & SKU", url: "/integrations" }],
      },

      {
        title: "Laporan",
        icon: Icons.PieChart,
        items: [{ title: "Stok & Penjualan", url: "/reports" }],
      },
    ],
  },

  {
    label: "SYSTEM",
    items: [

      {
        title: "Akun",
        icon: Icons.User,
        items: [
          { title: "Ganti Password", url: "/account" },
          { title: "Pengguna", url: "/users" },
        ],
      },

      {
        title: "Audit Logs",
        icon: Icons.Authentication,
        items: [{ title: "Aktivitas", url: "/audit-logs" }],
      },
    ],
      },

      {
        title: "Pengguna",
        icon: Icons.User,
        items: [{ title: "Staff", url: "/users" }],
      },

      {
        title: "Audit Logs",
        icon: Icons.Authentication,
        items: [{ title: "Aktivitas", url: "/audit-logs" }],
      },
    ],
  },

];
