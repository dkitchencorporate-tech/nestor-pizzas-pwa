CREATE POLICY "Public Insert Products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public Delete Products" ON products FOR DELETE USING (true);

CREATE POLICY "Public Insert Categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public Delete Categories" ON categories FOR DELETE USING (true);

CREATE POLICY "Public Insert Upsells" ON upsells FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Upsells" ON upsells FOR UPDATE USING (true);
CREATE POLICY "Public Delete Upsells" ON upsells FOR DELETE USING (true);
