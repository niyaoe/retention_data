import { useEffect, useState } from "react";
import api from "../../services/api";
import DataTable from "../../components/common/DataTable";
import "./SalesData.css";

const SalesData = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch sales records
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/data/sales", {
          params: {
            page,
            limit,
            search: debouncedSearch,
          },
        });

        const result = response.data;

        const formattedData = (result.data || []).map((record) => ({
          ...record,
          saleBranch:
            record.branchDetails?.branchName || record.saleBranch || "-",
        }));

        setData(formattedData);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load sales records.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [page, limit, debouncedSearch]);

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN");
  };

  const columns = [
    {
      key: "deliveryDate",
      label: "Delivery Date",
      render: (value) => formatDate(value),
    },
    {
      key: "saleBranch",
      label: "Sales Branch",
    },
    {
      key: "chassisNumber",
      label: "Chassis Number",
    },
    {
      key: "registrationNumber",
      label: "Registration Number",
    },
    {
      key: "modelGroup",
      label: "Model Group",
    },
    {
      key: "customerName",
      label: "Customer Name",
    },
    {
      key: "pinCode",
      label: "PIN Code",
    },
    {
      key: "city",
      label: "City",
    },
    {
      key: "tehsil",
      label: "Tehsil",
    },
    {
      key: "district",
      label: "District",
    },
    {
      key: "financier",
      label: "Financier",
    },
    {
      key: "segment",
      label: "Segment",
    },
    {
      key: "mobileNo",
      label: "Mobile Number",
    },
  ];

  return (
    <div className="ret-sales-page">
      {/* <div className="ret-sales-header">
        <div>
          <h2>Sales Data</h2>
          <p>View and search all vehicle sales records.</p>
        </div>
      </div> */}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        page={page}
        total={total}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />
    </div>
  );
};

export default SalesData;
