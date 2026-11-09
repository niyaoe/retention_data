import { useEffect, useState } from "react";
import api from "../../services/api";
import DataTable from "../../components/common/DataTable";
import "./DmsRetail.css";

const DmsRetail = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchDmsRetailData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/data/dms-retail", {
          params: {
            page,
            limit,
            search: debouncedSearch,
          },
        });

        const result = response.data;

        setData(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load DMS retail records."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDmsRetailData();
  }, [page, limit, debouncedSearch]);

 const columns = [
  {
    key: "chassisNumber",
    label: "Chassis Number",
  },
  {
    key: "modelGroup",
    label: "Model Group",
  },
  {
    key: "pin",
    label: "PIN",
  },
  {
    key: "emailId",
    label: "Email",
  },
  {
    key: "phoneNo",
    label: "Phone Number",
  },
  {
    key: "dealerCode",
    label: "Dealer Code",
  },
  {
    key: "lesseeMobileNumber",
    label: "Lessee Mobile",
  },
  {
    key: "invoiceDateTime",
    label: "Invoice Date",
    render: (value) =>
      value ? new Date(value).toLocaleDateString("en-IN") : "-",
  },
  {
    key: "invoiceDateTime",
    label: "Invoice Month",
    render: (value) =>
      value
        ? new Date(value).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
        : "-",
  },
];

  return (
    <div className="ret-dms-page">
      {/* <div className="ret-dms-header">
        <div>
          <h2>DMS Retail Data</h2>
          <p>View and search all DMS retail records.</p>
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

export default DmsRetail;