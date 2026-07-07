#!/usr/bin/env python3
"""png-to-template.py -- Convert a color PNG into a macOS Template Image.

A Template Image has black (0,0,0) for all non-transparent pixels and
preserves the alpha channel.  This allows macOS to automatically recolor
the icon for light/dark menu bar modes (via Electron's setTemplateImage).

Usage: python3 png-to-template.py <input.png> <output.png>
"""
import struct
import zlib
import sys


def make_chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
	"""Build a complete PNG chunk: length + type + data + CRC32."""
	raw = chunk_type + chunk_data
	crc = struct.pack('>I', zlib.crc32(raw) & 0xFFFFFFFF)
	return struct.pack('>I', len(chunk_data)) + raw + crc


def png_to_template(input_path: str, output_path: str) -> None:
	with open(input_path, 'rb') as f:
		data = f.read()

	# Validate PNG signature
	if data[:8] != b'\x89PNG\r\n\x1a\n':
		raise SystemExit(f'Not a valid PNG: {input_path}')

	pos = 8
	chunks_before_idat: list[tuple[bytes, bytes]] = []
	idat_parts: list[bytes] = []

	# Parse all chunks
	while pos < len(data):
		length = struct.unpack('>I', data[pos:pos + 4])[0]
		chunk_type = data[pos + 4:pos + 8]
		chunk_data = data[pos + 8:pos + 8 + length]
		pos += 12 + length

		if chunk_type == b'IEND':
			break
		elif chunk_type == b'IDAT':
			idat_parts.append(chunk_data)
		else:
			chunks_before_idat.append((chunk_type, chunk_data))

	if not idat_parts:
		raise SystemExit(f'No IDAT chunk found in: {input_path}')

	# Concatenate all IDAT chunks, then decompress
	raw_idat = b''.join(idat_parts)
	raw_pixels = zlib.decompress(raw_idat)

	# Extract image dimensions and color type from IHDR
	ihdr_data = None
	for ct, cd in chunks_before_idat:
		if ct == b'IHDR':
			ihdr_data = cd
			break

	if ihdr_data is None:
		raise SystemExit(f'No IHDR chunk found in: {input_path}')

	width = struct.unpack('>I', ihdr_data[0:4])[0]
	height = struct.unpack('>I', ihdr_data[4:8])[0]
	color_type = ihdr_data[9]

	if color_type == 6:
		bpp = 4  # RGBA
	elif color_type == 2:
		bpp = 3  # RGB
	else:
		raise SystemExit(
			f'Unsupported color type {color_type}'
			f' -- expected RGBA (6) or RGB (2)'
		)

	# Each row has a leading filter byte (0 = None for sips output)
	bytes_per_row = 1 + width * bpp
	expected_len = bytes_per_row * height
	if len(raw_pixels) != expected_len:
		raise SystemExit(
			f'Pixel data length mismatch:'
			f' got {len(raw_pixels)}, expected {expected_len}'
		)

	# Transform: each non-transparent pixel becomes black (0,0,0)
	new_pixels = bytearray()
	for y in range(height):
		row_start = y * bytes_per_row
		filter_byte = raw_pixels[row_start]
		new_pixels.append(filter_byte)
		offset = row_start + 1

		for x in range(width):
			pixel_start = offset + x * bpp
			if color_type == 6:
				# RGBA: zero out RGB, preserve alpha
				a = raw_pixels[pixel_start + 3]
				new_pixels.extend([0, 0, 0, a])
			else:
				# RGB: just set to black
				new_pixels.extend([0, 0, 0])

	# Recompress
	compressed = zlib.compress(bytes(new_pixels))

	# Write output PNG
	with open(output_path, 'wb') as f:
		f.write(b'\x89PNG\r\n\x1a\n')
		for chunk_type, chunk_data in chunks_before_idat:
			f.write(make_chunk(chunk_type, chunk_data))
		f.write(make_chunk(b'IDAT', compressed))
		f.write(make_chunk(b'IEND', b''))

	print(f'  Created template: {output_path}')


if __name__ == '__main__':
	if len(sys.argv) != 3:
		print(f'Usage: {sys.argv[0]} <input.png> <output.png>')
		sys.exit(2)
	png_to_template(sys.argv[1], sys.argv[2])
